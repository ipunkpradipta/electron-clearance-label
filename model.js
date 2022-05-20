const { dblocal } = require('./connection');
const { getCurrentDate } = require('./helper');

module.exports = {
  getTrackingDetail: (trackingNumber) => {
    return new Promise((resolve, reject) => {
      dblocal.query(
        "SELECT * FROM d_label WHERE longtrack_number=?",
        [trackingNumber],
        (err, rows, fields) => {
          if (err) {
            console.log(err);
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
      // dblocal.end();
    });
  },
  updateTrackingDetail: (trackingNumber) => {
    return new Promise((resolve, reject) => {
      dblocal.query(
        "UPDATE d_label SET flag_hadir= '1',actual_date_arrival=NOW() WHERE longtrack_number=?",
        [trackingNumber],
        (err, rows, fields) => {
          if (err) {
            console.log(err);
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
      // dblocal.end();
    });
  },
  insertUnexTracking: (trackingNumber) => {
    return new Promise((resolve, reject) => {
      const sql = `INSERT INTO d_label (
        longtrack_number,
        service_number,
        airline_name,
        airline_flight,
        airline_origin,
        package_of_sequent,
        package_of_total,
        detail_bill,
        detail_clearance,
        detail_weight,
        detail_date_arrival,
        consignee_name,
        flag_hadir,
        flag_unex) VALUE (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
      dblocal.query(
        sql,
        [
          trackingNumber,
          trackingNumber,
          "MY INDO AIRLINES",
          "2Y923",
          "SGSIN",
          "1",
          "1",
          "P/P",
          "CN",
          "1.0",
          getCurrentDate(),
          "PT UPS CARDIG INTERNATIONAL",
          "1",
          "1",
        ],
        (err, result) => {
          if (err) return reject(err);
          console.log('insert',result);
        }
      );
    });
  },
  insertTrackingDetail: (data) => {
    return new Promise((resolve, reject) => {
      const sql = `INSERT INTO d_label (
        longtrack_number,
        service_number,
        airline_name,
        airline_flight,
        airline_origin,
        rec_type,
        package_of_sequent,
        package_of_total,
        detail_bill,
        detail_clearance,
        detail_weight,
        detail_date_arrival,
        consignee_name
        ) VALUE (?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE 
        service_number = service_number,
        longtrack_number=longtrack_number,
        airline_name=?,
        airline_flight=?,
        airline_origin=?,
        detail_clearance=?,
        detail_weight=?,
        detail_date_arrival=detail_date_arrival,
        flag_atensi=?,
        consignee_name=consignee_name
        `;
      dblocal.query(
        sql,
        [
          data.longtrack_number,
          data.service_number,
          data.airline_name,
          data.airline_flight,
          data.airline_origin,
          data.rec_type,
          data.package_of_sequent,
          data.package_of_total,
          data.detail_bill,
          data.detail_clearance,
          data.detail_weight,
          data.detail_date_arrival,
          data.consignee_name,
          data.airline_name,
          data.airline_flight,
          data.airline_origin,
          data.detail_clearance,
          data.detail_weight,
          data.flag_atensi,
        ],
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        }
      );
    });
  },
  getTrackingToBePush: () => {
    return new Promise((resolve, reject) => {
      const sql = "SELECT * FROM d_label WHERE flag_hadir = '1' AND flag_transfer = '0'";
      dblocal.query(sql, (err, rows, fields) => {
        if (err) return reject(err);
        return resolve(rows);
      })
    })
  },
  updateFlagTransfer: (trackingNumber) => {
    return new Promise((resolve, reject) => {
      const sql = "UPDATE d_label SET flag_transfer='1' WHERE longtrack_number = ?";
      dblocal.query(sql,[trackingNumber], (err, rows, fields) => {
        if (err) return reject(err);
        return resolve(rows);
      })
    })
  }
};