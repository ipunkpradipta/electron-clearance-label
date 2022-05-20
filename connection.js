const { app, dialog, BrowserWindow } = require("electron");
const mysql = require("mysql");
const config = require("./config");
var dblocal = mysql.createConnection({
  host: config.DB_HOST,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_DATABASE,
});
dblocal.connect(function (err) {
  if (err) {
    console.log(err);
    const messageBoxOptions = {
      type: "error",
      title: "Koneksi Database Error",
      buttons: ["Ok"],
      defaultId: 0,
      message: "Hubungi Developer!",
      detail: err.sqlMessage,
    };
    dialog
      .showMessageBox(
        new BrowserWindow({
          show: false,
          alwaysOnTop: true,
        }),
        messageBoxOptions
      )
      .then((res) => {
        console.log(res.response);
        if (res.response == 0) {
          return app.exit();
        }
      });
  }
  console.log("db local server connected!");
});

module.exports = { dblocal };
