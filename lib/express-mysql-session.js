const session = require('express-session');

class MySQLStore extends session.Store {
    constructor(pool) {
        super();
        this.pool = pool;
    }

    get(sid, callback) {
        const now = Math.floor(Date.now() / 1000);
        this.pool.execute(
            'SELECT data FROM sessions WHERE session_id = ? AND expires > ?',
            [sid, now],
            (err, rows) => {
                if (err) return callback(err);
                if (!rows.length) return callback(null, null);
                
                try {
                    const sessionData = JSON.parse(rows[0].data);
                    callback(null, sessionData);
                } catch (parseErr) {
                    callback(parseErr);
                }
            }
        );
    }

    set(sid, sessionData, callback) {
        const maxAge = sessionData.cookie?.maxAge || 86400000;
        const expires = Math.floor((Date.now() + maxAge) / 1000);
        
        let data;
        try {
            data = JSON.stringify(sessionData);
        } catch (err) {
            return callback(err);
        }

        this.pool.execute(
            'REPLACE INTO sessions (session_id, expires, data) VALUES (?, ?, ?)',
            [sid, expires, data],
            (err) => {
                if (err) return callback(err);
                callback(null);
            }
        );
    }

    destroy(sid, callback) {
        this.pool.execute(
            'DELETE FROM sessions WHERE session_id = ?',
            [sid],
            (err) => {
                if (err) return callback(err);
                callback(null);
            }
        );
    }

    touch(sid, sessionData, callback) {
        const maxAge = sessionData.cookie?.maxAge || 86400000;
        const expires = Math.floor((Date.now() + maxAge) / 1000);
        
        this.pool.execute(
            'UPDATE sessions SET expires = ? WHERE session_id = ?',
            [expires, sid],
            (err) => {
                if (err) return callback(err);
                callback(null);
            }
        );
    }
}

module.exports = MySQLStore;