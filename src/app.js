'use strict';

const express = require('express');
const app = express();

const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();


module.exports = (db) => {
    app.get('/health', (req, res) => res.send('Healthy'));

    app.post('/rides', jsonParser, async(req, res) => {
        const startLatitude = Number(req.body.start_lat);
        const startLongitude = Number(req.body.start_long);
        const endLatitude = Number(req.body.end_lat);
        const endLongitude = Number(req.body.end_long);
        const riderName = req.body.rider_name;
        const driverName = req.body.driver_name;
        const driverVehicle = req.body.driver_vehicle;

        if (startLatitude < -90 || startLatitude > 90 || startLongitude < -180 || startLongitude > 180) {
            return res.send({
                error_code: 'VALIDATION_ERROR',
                message: 'Start latitude and longitude must be between -90 - 90 and -180 to 180 degrees respectively'
            });
        }

        if (endLatitude < -90 || endLatitude > 90 || endLongitude < -180 || endLongitude > 180) {
            return res.send({
                error_code: 'VALIDATION_ERROR',
                message: 'End latitude and longitude must be between -90 - 90 and -180 to 180 degrees respectively'
            });
        }

        if (typeof riderName !== 'string' || riderName.length < 1) {
            return res.send({
                error_code: 'VALIDATION_ERROR',
                message: 'Rider name must be a non empty string'
            });
        }

        if (typeof driverName !== 'string' || driverName.length < 1) {
            return res.send({
                error_code: 'VALIDATION_ERROR',
                message: 'Rider name must be a non empty string'
            });
        }

        if (typeof driverVehicle !== 'string' || driverVehicle.length < 1) {
            return res.send({
                error_code: 'VALIDATION_ERROR',
                message: 'Rider name must be a non empty string'
            });
        }

        var values = [req.body.start_lat, req.body.start_long, req.body.end_lat, req.body.end_long, req.body.rider_name, req.body.driver_name, req.body.driver_vehicle];
        
        try{

            //callback function passed to db.run is replace by try and catch block
            const result = await db.run('INSERT INTO Rides(startLat, startLong, endLat, endLong, riderName, driverName, driverVehicle) VALUES (?, ?, ?, ?, ?, ?, ?)', values);
            const stmt = await db.prepare(`SELECT * FROM Rides WHERE rideID = ?`);
            const rows = await stmt.allAsync([result.lastID]);
            res.send(rows);
        } catch (error) {
            return res.send({
                error_code: 'SERVER_ERROR',
                message: 'Unknown error'
            });
        }
    });

    // Note : getPaginationParams and getRides can be tested independently and we can be sure that it is working as expected

    function getPaginationParams(req) {

        // Get the page and pageSize from the query parameters or use default values
        const page = req.query.page || 1;
        const pageSize = req.query.pageSize || 10;

        // Calculate the offset to get correct subset of rows from database
        const offset = (page - 1) * pageSize;
        return [pageSize, offset];
    }
    

    async function getRides(db, pageSize, offset) {

        const stmt = await db.prepare(`SELECT * FROM Rides LIMIT ? OFFSET ?`);
        const result = await stmt.allAsync([pageSize, offset]);
        // Here values are passed separately and are not concatenated to the query string, and the query engine takes care of escaping these values properly, which is important to prevent SQL injection.
        // Another way to prevent SQL Injection is using ORM, Object-relational mapping, that abstracts away the SQL 
        if (result.length === 0) {
            //Error for 0 rides
            throw new Error('RIDES_NOT_FOUND_ERROR');
        }
        return result;
    }


    app.get('/rides', async (req, res) => {
        try {
            const [pageSize, offset] = getPaginationParams(req);
            const result = await getRides(db, pageSize, offset);
            res.send(result);
        } catch (error) {
            console.log(error);

            // Send a 500 status code and an error message as a response
            res.status(500).send({
                error_code: 'SERVER_ERROR',
                message: 'Unknown error'
            });
        }
    });
    

    app.get('/rides/:id', (req, res) => {
        db.all(`SELECT * FROM Rides WHERE rideID='${req.params.id}'`, function (err, rows) {
            if (err) {
                return res.send({
                    error_code: 'SERVER_ERROR',
                    message: 'Unknown error'
                });
            }

            if (rows.length === 0) {
                return res.send({
                    error_code: 'RIDES_NOT_FOUND_ERROR',
                    message: 'Could not find any rides'
                });
            }

            res.send(rows);
        });
    });

    return app;
};
