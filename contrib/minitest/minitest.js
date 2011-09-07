var minitest = require("./lib/minitest");

for (var key in minitest) {
  exports[key] = minitest[key];
}
