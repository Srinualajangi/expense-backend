module.exports = Object.freeze({
    DB_HOST : process.env.DB_HOST || 'mysql-service',
    DB_USER : process.env.DB_USER || 'root',
    DB_PWD : process.env.DB_PASSWORD || 'ExpenseApp@1',
    DB_DATABASE : process.env.DB_NAME || 'transactions'
});
