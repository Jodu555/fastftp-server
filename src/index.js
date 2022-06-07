const ftpd = require('ftpd');
const fs = require('fs');

/**
 * @link https://github.com/nodeftpd/nodeftpd
 * @link https://github.com/nodeftpd/nodeftpd/blob/master/test.js
 */

class FTPServer {
    constructor(host, port) {
        this.host = host;
        this.port = port;
        // this.tls = {
        //     key: fs.readFileSync('keyFile'),
        //     cert: fs.readFileSync('certFile'),
        // }
        this.server = new ftpd.FtpServer(this.host, {
            getInitialCwd: (connection) => '',
            getRoot: (connection) => connection?.auth?.result?.root || process.cwd(),
            pasvPortRangeStart: 1025,
            pasvPortRangeEnd: 1050,
            // tlsOptions: this.tls,
            allowUnauthorizedTls: true,
            useWriteFile: false,
            useReadFile: false,
            uploadMaxSlurpSize: 7000, // N/A unless 'useWriteFile' is true.
        });
    }

    listen() {
        this.server.on('error', (error) => {
            console.log('FTP Server error:', error);
        });

        this.server.on('client:connected', async (connection) => {
            console.log('client connected: ' + connection.socket.remoteAddress);

            const { username, success: usr_success, failure: usr_failure } = await new Promise((resolve, reject) => {
                connection.once('command:user', (username, success, failure) => {
                    resolve({ username, success, failure })
                });
            })
            if (!username)
                return usr_failure();

            usr_success();

            const { password, success: pw_success, failure: pw_failure } = await new Promise((resolve, reject) => {
                connection.once('command:pass', async (password, success, failure) => {
                    resolve({ password, success, failure })
                });
            })

            if (!password)
                return pw_failure();

            const result = await this.authFunction(username, password);

            if (!result.success)
                return pw_failure();


            connection.auth = { username, password, result };
            pw_success(username);

        });
        this.server.debugging = 1;
        this.server.listen(this.port);
        console.log('Listening on port ' + this.port);
    }

    onAuthenticate(cb) {
        this.authFunction = cb;
    }
}

module.exports = FTPServer;