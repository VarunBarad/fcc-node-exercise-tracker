'use strict';

const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const shortId = require('shortid');
const moment = require('moment');

// enable CORS (https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)
// so that your API is remotely testable by FCC
const cors = require("cors");
app.use(cors({optionSuccessStatus: 200})); // some legacy browsers choke on 204

app.get("/", function (req, res) {
    res.sendFile(__dirname + "/views/index.html");
});

app.use(bodyParser.urlencoded({extended: false}));

const isValidDate = (date) => {
    return ((date instanceof Date) && !isNaN(date));
};

const users = [];
app.post('/api/exercise/new-user', function (request, response) {
    const username = request.body.username || null;

    if (username) {
        const existingUser = users.filter((user) => (user.username === username))[0] || null;

        if (existingUser) {
            response.status(400);
            response.send('username already taken');
        } else {
            const newUser = {
                username: username,
                _id: shortId.generate()
            };
            users.push(newUser);
            response.json(newUser);
        }
    } else {
        response.status(400);
        response.send('Path `username` is required.');
    }
});
app.get('/api/exercise/users', function(request, response) {
    response.json(users);
});

const exerciseLogs = [];
app.post('/api/exercise/add', function (request, response) {
    const userId = request.body.userId || null;
    const description = request.body.description || null;
    const duration = parseInt(request.body.duration) || null;
    const date = request.body.date || (new Date());

    const existingUser = users.find((user) => (user._id === userId));
    if (userId && existingUser) {
        if (duration || (duration === 0)) {
            if (description) {
                if (duration < 1) {
                    response.status(400);
                    response.send('duration too short');
                } else {
                    const newExerciseLog = {
                        userId: userId,
                        description: description,
                        duration: duration,
                        date: date
                    };
                    exerciseLogs.push(newExerciseLog);
                    response.json({
                        username: existingUser.username,
                        _id: userId,
                        description: description,
                        duration: duration,
                        date: moment(date).format('ddd MMM DD YYYY')
                    });
                }
            } else {
                response.status(400);
                response.send('Path `description` is required.');
            }
        } else {
            response.status(400);
            response.send('Path `duration` is required.');
        }
    } else {
        response.status(400);
        response.send('unknown _id');
    }
});

app.get('/api/exercise/log', function (request, response) {
    const userId = request.query.userId || null;
    const from = request.query.from || null;
    const to = request.query.to || null;
    const limit = parseInt(request.query.limit) || null;

    const existingUser = users.find((user) => (user._id === userId)) || null;
    if (userId && existingUser) {
        let fromCondition;
        if (from) {
            const fromDate = new Date(from);
            if (isValidDate(fromDate)) {
                fromCondition = ((log) => moment(log.date).isSameOrAfter(moment(fromDate), 'day'));
            } else {
                fromCondition = ((log) => true);
            }
        } else {
            fromCondition = ((log) => true);
        }

        let toCondition;
        if (to) {
            const toDate = new Date(to);
            if (isValidDate(toDate)) {
                toCondition = ((log) => moment(log.date).isSameOrBefore(moment(toDate), 'day'));
            } else {
                toCondition = ((log) => true);
            }
        } else {
            toCondition = ((log) => true);
        }

        const matchingLogs = exerciseLogs.filter((l) => ((l.userId === userId) && fromCondition(l) && toCondition(l)));
        if (limit && limit > 0) {
            const limitedLogs = matchingLogs.slice(0, limit);
            response.json({
                _id: userId,
                username: existingUser.username,
                count: limitedLogs.length,
                log: limitedLogs.map(log => ({
                    description: log.description,
                    duration: log.duration,
                    date: moment(log.date).format('ddd MMM DD YYYY')
                }))
            });
        } else {
            response.json({
                _id: userId,
                username: existingUser.username,
                count: matchingLogs.length,
                log: matchingLogs.map(log => ({
                    description: log.description,
                    duration: log.duration,
                    date: moment(log.date).format('ddd MMM DD YYYY')
                }))
            });
        }
    } else {
        response.status(400);
        response.send('unknown userId');
    }
});

const listener = app.listen(process.env.PORT || 5000, () => {
    console.log(`Your app is listening on port ${listener.address().port}`);
});
