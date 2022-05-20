require('dotenv').config();
const electron = require("electron");
const { dialog } = require("electron");
const url = require("url");
const path = require("path");
const { getTrackingDetail, updateTrackingDetail, insertUnexTracking } = require("./model");
const { loadDataFromCias, updateDataToCias } = require("./proses");
const config = require('./config');

//load Module Electron
const { app, BrowserWindow, Menu, ipcMain } = electron;

let mainWindow;

//Create menu template
const mainMenuTemplate = [
  {
    label: "File",
    submenu: [
      {
        label: "Login",
        click() {
          mainWindow.loadFile(__dirname + config.URL_PAGE_LOGIN);
          // mainWindow.loadURL(
          //   url.format({
          //     pathname: path.join(__dirname, "page/login.html"),
          //     protocol: "file:",
          //     slashes: true,
          //   })
          // );
        },
      },
      {
        label: "Quit",
        accelerator: process.platform == "darwin" ? "Command+Q" : "Ctrl+Q",
        click() {
          app.quit();
        },
      },
    ],
  },
];

const createWindow = () => {
  // create a new `splash`-Window
  splash = new BrowserWindow({
    width: 810,
    height: 610,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
  });

  splash.loadFile(__dirname + config.URL_PAGE_SPLASH);
  // splash.loadURL(
  //   url.format({
  //     pathname: path.join(__dirname, "page/splashscreen.html"),
  //     protocol: "file:",
  //     slashes: true,
  //   })
  // );

  //create main windows
  mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: __dirname + `/assets/icons/cias2.ico`,
    show: false,
  });

  // load html into windows
  mainWindow.loadFile(__dirname + config.URL_PAGE_MAIN)
  // mainWindow.loadURL(
  //   url.format({
  //     // pathname: path.join(__dirname, "page/scan-new.html"),
  //     pathname: path.join(__dirname, "page/mainWindow.html"),
  //     protocol: "file:",
  //     slashes: true,
  //   })
  // );

  // mainWindow.webContents.openDevTools();

  // if main window is ready to show, then destroy the splash window and show up the main window
  mainWindow.once("ready-to-show", () => {
    splash.destroy();
    mainWindow.maximize();
    mainWindow.show();
  });

  // Build menu from template
  const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);

  // insert menu
  Menu.setApplicationMenu(mainMenu);

  //BRFORE QUIT
  mainWindow.on("close", (event) => {
    event.preventDefault();
    dialog
      .showMessageBox(mainWindow, {
        title: "Konfirmasi Tutup Aplikasi",
        message: "Yakin?",
        detail: "Aksi ini akan menutup Applikasi",
        type: "question",
        buttons: ["Ok", "Cancel"],
        defaultId: 0,
      })
      .then((res) => {
        console.log(res);
        if (res.response === 0) {
          mainWindow.destroy();
        }
      });
  });

  //AFTER QUIT
  mainWindow.on("closed", (event) => {
    app.quit();
  });
}

// Listen for ap to be ready
app.on('ready', () => {
  createWindow();
});


console.log('environment',process.env.NODE_ENV);

//add developer tools if not in production
// if (process.env.NODE_ENV !== 'production') {
//   mainMenuTemplate.push({
//     label: "Developer Tools",
//     submenu: [
//       {
//         label: "Toggle DevTools",
//         accelerator: process.platform == "darwin" ? "Command+I" : "Ctrl+I",
//         click(item, focusWindow) {
//           focusWindow.toggleDevTools();
//         },
//       },
//       {
//         role: 'reload'
//       }
//     ],
//   });
// }

const authenticatedMenu = {
  label: "Data",
  submenu: [
    {
      label: "Ambil Data Dari CIAS 2",
      click() {
        const loadDataWindow = openLoaderWindow();
        handleLoadDataFromCias(loadDataWindow);
      },
    },
    {
      label: "Simpan Data",
      accelerator: process.platform == "darwin" ? "Command+S" : "Ctrl+S",
      click() {
        const loadDataWindow = openLoaderWindow();
        handleSimpanData(loadDataWindow);
      },
    },
  ],
};

//handle login
ipcMain.on("login-success", function (e, data) {
  //change window to main
  mainWindow.loadFile(__dirname + config.URL_PAGE_MAIN);
  // mainWindow.loadURL(
  //   url.format({
  //     pathname: path.join(__dirname, "page/mainWindow.html"),
  //     protocol: "file:",
  //     slashes: true,
  //   })
  // );
  // console.log('login-data',data)
  // mainWindow.webContents.openDevTools();
  mainWindow.webContents.send("login:dataUser", data);
  mainMenuTemplate.push(authenticatedMenu);
  mainMenuTemplate[0].submenu.shift();
  mainMenuTemplate[0].submenu.unshift({
    label: "Buat Label",
    click() {
      mainWindow.loadFile(__dirname + config.URL_PAGE_SCAN);
      // mainWindow.loadURL(
      //   url.format({
      //     pathname: path.join(__dirname, "page/scan-new.html"),
      //     protocol: "file:",
      //     slashes: true,
      //   })
      // );
    },
  });
  // Build menu from template
  const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);

  // set access menu
  Menu.setApplicationMenu(mainMenu);
});

ipcMain.on("login-fail", (event, data) => {
  const messageBoxOptions = {
    type: "error",
    title: data,
    buttons: ["Ok"],
    defaultId: 0,
    message: 'Periksa Koneksi Internet anda',
    detail: 'Atau Hubungi developer, Terimkasih!',
  };
  dialog.showMessageBox(messageBoxOptions).then((res) => {
    console.log(res.response);
    if (res.response == 0) {
      return app.close();
    }
  });
});

const openLoaderWindow = () => {
  
  const loadDataWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    frame: false,
    alwaysOnTop: true,
    width: 600,
    height: 400,
  });
  loadDataWindow.loadFile(__dirname + config.URL_PAGE_LOADER);
  // loadDataWindow.loadURL(
  //   url.format({
  //     pathname: path.join(__dirname, "page/spinner.html"),
  //     protocol: "file:",
  //     slashes: true,
  //   })
  // );
  return loadDataWindow;
}

//handle load data from cias
const handleLoadDataFromCias = async window => {
  try {
    const processData = await loadDataFromCias();
    if (processData.status) {
      window.close();
      dialog.showMessageBox({
        title: `Load Data`,
        message: `Total ${processData.total_data} data ditarik dari CIAS 2`,
        detail: `Total Data Valid \t: ${processData.total_valid}\nTotal Data Tidak Valid \t: ${processData.total_not_valid} (Service Number Kosong, Airlines Name Kosong)\nTotal Data Disimpan \t: ${processData.total_insert}
                `,
        buttons: ["OK"],
        icon: __dirname + `/assets/icons/notification.ico`,
      });
    }
  } catch (err) {
    console.log(err);
    const messageBoxOptions = {
      type: "error",
      title: "Database Error",
      buttons: ["Ok"],
      defaultId: 0,
      message: err.code,
      detail: err.sqlMessage,
    };
    dialog.showMessageBox(messageBoxOptions).then((res) => {
      console.log(res.response);
      if (res.response == 0) {
        return window.close();
      }
    });
  }
}

//handle simpan data
const handleSimpanData = async window => {
  try {
    const processData = await updateDataToCias(window);
    if (processData.status) {
      dialog.showMessageBox({
        title: `Simpan Data`,
        message: `Total ${processData.total_data_updated} data disimpan ke CIAS 2`,
        detail: processData.total_data_updated == 0 ? "Atau belum ada data baru yang siap dikirim" : "",
        buttons: ["OK"],
        icon: __dirname + `/assets/icons/notification.ico`,
      });
    }
  } catch (err) {
    console.log(err);
    window.close();
  }
}


//handle tracking
ipcMain.on("tracking:handleTrackingNumber", async (event, data) => {
  if (data.length == 0) {
    return dialog.showMessageBox(mainWindow, {
      title: "Error",
      buttons: ["Close"],
      type: "warning",
      message: "Tracking Number tidak boleh kosong!",
      icon: __dirname + `/assets/icons/notification.ico`,
    });
  }

  const dataLabel = await getTrackingDetail(data);

  let arrayReturn = [];

  if (dataLabel.length > 0) {
    dataLabel.map((value, index) => {
      arrayReturn.push(
        value.longtrack_number,
        value.package_of_total,
        value.detail_weight,
        value.detail_clearance
      );
    });

    //send content to scan page
    mainWindow.webContents.send("tracking:addToArrayList", arrayReturn);
    //Open label window
    openWindowLabel(dataLabel[0]);
  } else {
    try {
      await insertUnexTracking(data);
    } catch (err) {
      console.log('err',err)
    }
  }
});

let labelWindow;
const openWindowLabel = (dataLabel) => {
  labelWindow = new BrowserWindow({
    width: 500,
    height: 300,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // labelWindow.loadURL("file://" + __dirname + "/page/label.html");
  labelWindow.loadFile(__dirname + config.URL_PAGE_LABEL);
  labelWindow.setMenu(null);
  labelWindow.once("ready-to-show", () => {
    // labelWindow.webContents.openDevTools();
    labelWindow.webContents.send("tracking:dataLabel", dataLabel);
  });
}

//handle print label
ipcMain.on("tracking:printLabel", async (event, data) => {
  console.log("dataFromLabel", data);
  try {
    await updateTrackingDetail(data);
  } catch (err) {
    console.log(err);
    const messageBoxOptions = {
      type: "error",
      title: "MySQL Error",
      buttons: ["Ok"],
      defaultId: 0,
      message: err.code,
      detail: err.sqlMessage,
    };
    dialog.showMessageBox(messageBoxOptions).then((res) => {
      console.log(res.response);
      if (res.response == 0) {
        return labelWindow.close();
      }
    });
  }
  labelWindow.webContents.print(
    {
      silent: true,
      printBackground: true,
      margins: {
        marginType: "printableArea",
      },
      // deviceName: "XXXX",
      pageSize: {
        width: 1000,
        height: 1800,
      },
    },
    (success, failureReason) => {
      if (!success) console.log(failureReason);
      labelWindow.close();
      console.log(success);
      console.log(failureReason);
    }
  );
});