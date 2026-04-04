const { AsyncLocalStorage } = require('async_hooks');
const requestContext = new AsyncLocalStorage();
module.exports = requestContext;
//it allows you to store data (like a user's ID or their private API keys) in one place and access it anywhere in your code without having to pass it through every single function as an argument.