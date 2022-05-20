const { default: axios } = require("axios");
const { dialog, BrowserWindow } = require("electron");
const { URL_GET_DATA, URL_PUSH_DATA } = require("./config");
const { insertTrackingDetail, getTrackingToBePush, updateFlagTransfer } = require("./model");

module.exports = {
  loadDataFromCias: () => {
    return new Promise(async (resolve, reject) => {
      let response = await axios.post(URL_GET_DATA);
      if (response.status !== 200) {
        const messageBoxOptions = {
          type: "error",
          title: "Koneksi ke Server Error",
          buttons: ["Ok"],
          defaultId: 0,
          message: err.code,
          detail: err.sqlMessage,
        };
        return dialog.showMessageBox(messageBoxOptions).then((res) => {
          if (res.response == 0) {
            return app.exit();
          }
        });
      } else {
        const dataRaw = response.data?.data;
        let dataToInsert = {};
        let counterDataInserted = 0;
        let counterDataValid = 0;
        let counterDataNotValid = 0;
        dataRaw.map(
          async (value, index) => {
            if (value.service_number && value.airline_name) {
              let sequential = 0;
              let rectype = value.rec_type;
              if (rectype == "202000") {
                sequential = 1;
              } else {
                let ujung = rectype.substring(1);
                sequential = parseInt(ujung) + 2;
              }
              dataToInsert.longtrack_number = value.longtrack_number;
              dataToInsert.service_number = value.service_number;
              dataToInsert.airline_name = value.airline_name;
              dataToInsert.airline_flight = value.flight_number;
              dataToInsert.airline_origin = value.origin_country;
              dataToInsert.rec_type = value.rec_type;
              dataToInsert.package_of_sequent = sequential;
              dataToInsert.package_of_total = value.quantity_package;
              dataToInsert.detail_bill = value.payment_method;
              dataToInsert.detail_clearance = value.clearance_type;
              dataToInsert.detail_weight = value.parcel_weight;
              dataToInsert.detail_date_arrival = value.flight_date;
              dataToInsert.consignee_name = value.consignee_name;
              dataToInsert.flag_atensi = value.flag_atensi;
              try {
                const insertProcess = await insertTrackingDetail(dataToInsert);
                if (insertProcess.affectedRows == 1) {
                  ++counterDataInserted;
                }
              } catch (err) {
                reject(err);
              }
              ++counterDataValid;
            } else {
              ++counterDataNotValid;
            }
            if (index === dataRaw.length - 1) {
              resolve({
                status: true,
                total_data: dataRaw.length,
                total_valid: counterDataValid,
                total_not_valid: counterDataNotValid,
                total_insert: counterDataInserted,
              });
            }
          }
        );
      }
    })
  },
  updateDataToCias: (window) => {
    return new Promise(async (resolve, reject) => {
      try {
        const getDataFromDb = await getTrackingToBePush();
        // console.log("getDataFromDb", getDataFromDb);
        let counterUpdated = 0;
        getDataFromDb.map(async (value, index) => {
          try {
            const payload = {
              longtrack: value.longtrack_number,
              actual_date_arrival: value.actual_date_arrival,
            };
            const pushData = await axios.post(URL_PUSH_DATA, payload);
            const response = pushData.data;
            if (response.status !== 'success') {
              const messageBoxOptions = {
                type: "error",
                title: "Validasi CIAS 2",
                message: response.message,
              };
              reject({ status: false, message: "Validation Failed" });
              window.close();
              return dialog.showMessageBox(new BrowserWindow({
                show: false,
                alwaysOnTop:true
              }), messageBoxOptions);
            } else {
              counterUpdated++;
              console.log(await updateFlagTransfer(value.longtrack_number));
            }
          } catch (err) {
            console.log('err', err);
            window.close();
            let messageBoxOptions = {}
            if (err.code == 'EHOSTUNREACH') {
              messageBoxOptions = {
                type: "error",
                title: "Error",
                buttons: ["Ok"],
                defaultId: 0,
                message: "Periksa Koneksi Internet Anda",
              };
            }else if (err?.response.status == 500) {
              messageBoxOptions = {
                type: "error",
                title: "API CIAS 2 Error",
                buttons: ["Ok"],
                defaultId: 0,
                message: "Status Code " + err.response.status,
                detail:
                  err.response.statusText +
                  "\n" +
                  "API CIAS 2 Error Hubungi Developer, Terimakasih!",
              };
            } else {
              messageBoxOptions = {
                type: "error",
                // title: err.response.status,
                // buttons: ["Ok"],
                // defaultId: 0,
                message: "Hubungi Developer, Terimakasih!",
                detail: JSON.stringify(err),
              };
            }
            reject({ status: false,message:"API Error"})
            return dialog.showMessageBox(messageBoxOptions);
          }
          if (index === getDataFromDb.length - 1) {
            resolve({
              status: true,
              total_data_updated: counterUpdated,
            });
            window.close();
          }
        })
        if (getDataFromDb.length === 0) {
          window.close();
          resolve({ status: true, total_data_updated: getDataFromDb.length });
        }
        // if (getDataFromDb.length != 0) return resolve({ status: false, message: "Semua data sudah di push!" });
      } catch (err) {
        console.log(err)
        reject(err)
      }
    })
  }
}