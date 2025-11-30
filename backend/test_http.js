const httpStatus = require('http-status');
console.log('Type:', typeof httpStatus);
console.log('Keys:', Object.keys(httpStatus).slice(0, 5));
console.log('Has default:', !!httpStatus.default);
if (httpStatus.default) {
    console.log('Default keys:', Object.keys(httpStatus.default).slice(0, 5));
}
console.log('INTERNAL_SERVER_ERROR:', httpStatus.INTERNAL_SERVER_ERROR);
