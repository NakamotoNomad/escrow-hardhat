const express = require('express');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors());

const port = 3001;

app.post("/contractDeployed/:contractAddress", (req, res) => {
    const {contractAddress} = req.params;
    console.log("Backend received contractDeployed command for address: " + contractAddress);

    fs.appendFile('contracts.txt', contractAddress + "\n", (err) => {
        if (err) {
            console.error('Error writing to file', err);
            return res.status(500).send('Error saving data');
        }
        res.send('Data saved successfully');
    });
});

app.get('/getContracts', (req, res) => {
    console.log("Getting contracts");
    fs.readFile('contracts.txt', 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading from file', err);
            return res.status(500).send('Error reading data');
        }

        const lines = data.split('\n').filter(line => line.trim());

        res.json(lines);
    });
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
