"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let express = require('express');
let app = express();
let utils = require('util');
let http = require('http').Server(app);
let _io = require('socket.io')(http);
const program = require("commander");
const logger = require("./logger").logger;
const setLogLevel = require("./logger").setLogLevel;
const setLogFile = require("./logger").setLogFile;
const jsonfile = require("jsonfile");
let APP_PORT = 3002;
//let OLD_CACHE = "/data/dev/crispr/tmp";
let DATA_FOLDER = "/data/databases/mobi/crispr/reference_genomes";
let jobManager = require('ms-jobmanager');
let JM_ADRESS = "127.0.0.1";
let JM_PORT = undefined;
program
    .version('0.1.0')
    .option('-v, --verbosity [logLevel]', 'Set log level', setLogLevel, 'info')
    .option('-p, --port [TCP_PORT]', 'Job Manager socket')
    .option('-c, --conf [JSON_PARAM]', 'web service configuration file')
    .parse(process.argv);
if (!program.port)
    throw (`Please specify a port`);
if (!program.conf)
    throw (`Please specify a conf`);
let param = jsonfile.readFileSync(program.conf);
JM_PORT = parseInt(program.port);
jobManager.start({ 'port': JM_PORT, 'TCPip': JM_ADRESS })
    .on('ready', () => {
    logger.info("Starting web server");
    app.use(express.static('data/static'));
    app.use(express.static('node_modules'));
    app.get('/kill/:jobid', (req, res) => {
        let jobOptTest = {
            "jobProfile": "crispr-dev",
            "cmd": `scancel ${req.params.jobid}`
        };
        logger.info(`Trying to execute ${utils.format(jobOptTest)}`);
        let jobTest = jobManager.push(jobOptTest);
        jobTest.on("completed", (stdout, stderr) => {
            logger.info(`JOB completed\n${utils.format()}`);
            stdout.on('data', (d) => {
                logger.info(`${d.toString()}`);
                res.send(d.toString());
            });
        });
    });
    app.get('/tree', (req, res) => {
        var nano = require('nano')(param.endPoint_treedb);
        nano.request({ db: param.name_treedb, doc: "maxi_tree" }, (err, data) => {
            let tree_json = data["tree"].replace(/"/g, "'");
            tree_json = tree_json.replace(/ : [^']*/g, "");
            tree_json = tree_json.replace(/'/g, '"');
            res.json(JSON.parse(tree_json));
        });
    });
    app.get('/test', function (req, res) {
        res.send('Performing test');
        // logger.info(__dirname);
        let jobOptTest = {
            "exportVar": {
                "rfg": param.dataFolder,
                "gi": "Candidatus Blochmannia vafer str. BVAF GCF_000185985.2&Enterobacter sp. 638 GCF_000016325.1",
                "gni": "\"\"",
                "pam": "NGG",
                "sl": "20",
                "URL_CRISPR": param.url_vService
                /*,
                "HTTP_PROXY" : "",
                "https_proxy" : "",
                "HTTPS_PROXY" : ""*/
            },
            "modules": ["crispr-tools"],
            "jobProfile": "crispr-dev",
            "script": `${param.coreScriptsFolder}/crispr_workflow.sh`
        };
        logger.info(`Trying to push ${utils.format(jobOptTest)}`);
        let jobTest = jobManager.push(jobOptTest);
        jobTest.on("completed", (stdout, stderr) => {
            logger.info(`JOB completed\n${utils.format()}`);
            stdout.on('data', (d) => { logger.info(`${d.toString()}`); });
        });
    });
    app.get('/download/:jm_id/:job_id', (req, res) => {
        logger.info(`==>${req.params.jm_id}/${req.params.job_id}`);
        let _path = `/data/dev/crispr/tmp/${req.params.jm_id}/${req.params.job_id}/results_allgenome.txt`;
        res.download(_path);
    });
    /*
        Socket management
    */
    http.listen(APP_PORT, () => {
        logger.info(`Listening on port ${APP_PORT}`);
    });
    _io.on('connection', (socket) => {
        logger.info('connection');
        socket.on("submitSpecific", (data) => {
            // let x = data.seq;
            logger.info(`socket:submitSpecificGene\n${utils.format(data)}`);
            logger.info(`included genomes:\n${utils.format(data.gi)}`);
            logger.info(`excluded genomes:\n${utils.format(data.gni)}`);
            logger.info(`${utils.format(data.pam)}`);
            logger.info(`Length of motif: ${utils.format(data.sgrna_length)}`);
            logger.info(`Query : ${utils.format(data.seq)}`);
            let jobOpt = {
                "exportVar": {
                    "blastdb": param.blastdb,
                    "rfg": param.dataFolder,
                    "gi": data.gi.join('&'),
                    "gni": data.gni.join('&'),
                    "pam": data.pam,
                    "sl": data.sgrna_length,
                    "URL_CRISPR": param.url_vService,
                    "URL_TAXON": param.url_taxonDB,
                    "URL_TREE": param.url_taxon_treeDB,
                    "seq": data.seq,
                    "n": data.n,
                    "pid": data.pid
                },
                "modules": ["crispr-tools", "blast+"],
                "jobProfile": "crispr-dev",
                "script": `${param.coreScriptsFolder}/crispr_workflow_specific.sh`
            };
            logger.info(`Trying to push ${utils.format(jobOpt)}`);
            let job = jobManager.push(jobOpt);
            job.on("completed", (stdout, stderr) => {
                let _buffer = "";
                stdout.on('data', (d) => { _buffer += d.toString(); })
                    .on('end', () => {
                    let ans = { "data": undefined };
                    let buffer = JSON.parse(_buffer);
                    if (buffer.hasOwnProperty("emptySearch")) {
                        logger.info(`JOB completed-- empty search\n${utils.format(buffer.emptySearch)}`);
                        ans.data = ["Search yielded no results.", buffer.emptySearch];
                    }
                    else {
                        logger.info(`JOB completed-- Found stuff`);
                        logger.info(`${utils.inspect(buffer, false, null)}`);
                        let res = buffer.out;
                        ans.data = [res.data, res.not_in, res.tag, res.number_hits, res.data_card, res.gi, res.size, res.gene];
                    }
                    socket.emit('resultsSpecific', ans);
                });
            });
        });
        socket.on('submitAllGenomes', (data) => {
            logger.info(`socket:submitAllGenomes\n${utils.format(data)}`);
            logger.info(`included genomes:\n${utils.format(data.gi)}`);
            logger.info(`excluded genomes:\n${utils.format(data.gni)}`);
            logger.info(`${utils.format(data.pam)}`);
            logger.info(`Length of motif: ${utils.format(data.sgrna_length)}`);
            let jobOpt = {
                "exportVar": {
                    "rfg": param.dataFolder,
                    "gi": data.gi.join('&'),
                    "gni": data.gni.join('&'),
                    "pam": data.pam,
                    "sl": data.sgrna_length,
                    "URL_CRISPR": param.url_vService,
                    "URL_TAXON": param.url_taxonDB,
                    "URL_TREE": param.url_taxon_treeDB
                },
                "modules": ["crispr-tools"],
                "jobProfile": "crispr-dev",
                "script": `${param.coreScriptsFolder}/crispr_workflow.sh`
            };
            logger.info(`Trying to push ${utils.format(jobOpt)}`);
            let job = jobManager.push(jobOpt);
            job.on("ready", () => {
                logger.info(`JOB ${job.id} sumitted`);
                socket.emit("submitted", { "id": job.id });
            });
            job.on("completed", (stdout, stderr) => {
                let _buffer = "";
                stdout.on('data', (d) => { _buffer += d.toString(); })
                    .on('end', () => {
                    let buffer;
                    try {
                        buffer = JSON.parse(_buffer);
                    }
                    catch (e) {
                        socket.emit('resultsAllGenomes', { "data": ["An error occured", "Please contact sys admin"] });
                        return;
                    }
                    // JSON Parsing successfull
                    let ans = { "data": undefined };
                    if (buffer.hasOwnProperty("emptySearch")) {
                        logger.info(`JOB completed-- empty search\n${utils.format(buffer.emptySearch)}`);
                        ans.data = ["Search yielded no results.", buffer.emptySearch];
                    }
                    else {
                        let res = buffer.out;
                        logger.info(`JOB completed\n${utils.format(buffer.out)}`);
                        //   ans.data = [res.data, res.not_int,  res.tag, res.number_hits];
                        ans.data = [res.data, res.not_in, res.tag, res.number_hits, res.data_card, res.gi, res.size];
                    }
                    socket.emit('resultsAllGenomes', ans);
                });
            });
        });
    }); // io closure
}); // jm closure
