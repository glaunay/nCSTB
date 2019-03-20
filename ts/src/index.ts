let express = require('express');
let app = express();
let utils = require('util');
let http = require('http').Server(app);

let _io = require('socket.io')(http);

const program = require("commander");
const logger = require("./logger").logger;
const setLogLevel = require("./logger").setLogLevel;
const setLogFile = require("./logger").setLogFile;

import jsonfile = require('jsonfile');

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


app.get('/kill/:jobid',  (req, res) => {
    let jobOptTest = {
        "jobProfile" : "crispr-dev",
        "cmd" : `scancel ${req.params.jobid}`
    };
    logger.info(`Trying to execute ${utils.format(jobOptTest)}`);

    let jobTest = jobManager.push(jobOptTest);
    jobTest.on("completed",(stdout, stderr) => {
        logger.info(`JOB completed\n${utils.format()}`);
        stdout.on('data',(d)=>{
            logger.info(`${ d.toString() }`);
            res.send(d.toString());
        });
    });
});

app.get('/test', function (req, res) {
    res.send('Performing test');
   // logger.info(__dirname);
    let jobOptTest = {
        "exportVar" : {
            "rfg" : param.dataFolder,
            "gi" : "Candidatus Blochmannia vafer str. BVAF GCF_000185985.2&Enterobacter sp. 638 GCF_000016325.1",
            "gni" : "\"\"",
            "pam" : "NGG",
            "sl" : "20",
            "URL_CRISPR" : param.url_vService
            /*,
            "HTTP_PROXY" : "",
            "https_proxy" : "",
            "HTTPS_PROXY" : ""*/
        },
        "modules" : ["crispr-tools"],
        "jobProfile" : "crispr-dev",
        "script" : `${param.coreScriptsFolder}/crispr_workflow.sh`
    };
    logger.info(`Trying to push ${utils.format(jobOptTest)}`);

    let jobTest = jobManager.push(jobOptTest);
    jobTest.on("completed",(stdout, stderr) => {
        logger.info(`JOB completed\n${utils.format()}`);

        stdout.on('data',(d)=>{logger.info(`${ d.toString() }`);});
        
    });
})


app.get('/download/:jm_id/:job_id', (req,res) => {
    logger.info(`==>${req.params.jm_id}/${req.params.job_id}`);
    let _path = `/data/dev/crispr/tmp/${req.params.jm_id}/${req.params.job_id}/results_allgenome.txt`;
    res.download(_path);
});


/*
    Socket management
*/
http.listen(APP_PORT,()=>{
    logger.info(`Listening on port ${APP_PORT}`);
});
_io.on('connection', (socket)=>{ 
    logger.info('connection')

    socket.on("submitSpecific", (data) =>{
       // let x = data.seq;
        logger.info(`${utils.format(data)}`);

        let jobOpt = {
            "exportVar" : {
                "rfg" : DATA_FOLDER,
                "gi"  : data.gi.join('&'),
                "gni" : data.gni.join('&'),
                "pam" : data.pam,
                "sl"  : data.sgrna_length,
                "seq" : data.seq,
                "n"   : data.n,
                "pid" : data.pid 

            },
            "modules" : ["crispr"],
            "jobProfile" : "crispr-dev",
            "script" : `${__dirname}/../data/scripts/crispr_workflow_specific.sh`
        };
        
        logger.info(`Trying to push ${utils.format(jobOpt)}`);
    
        let job = jobManager.push(jobOpt);
        job.on("completed",(stdout, stderr) => {

            let _buffer = "";
            stdout.on('data',(d)=>{_buffer += d.toString();})
            .on('end',() => {
                let ans = {"data" : undefined};
                let buffer = JSON.parse(_buffer);
                
                if (buffer.hasOwnProperty("emptySearch")) {
                    logger.info(`JOB completed-- empty search\n${utils.format(buffer.emptySearch)}`);
                    ans.data = ["Search yielded no results.", buffer.emptySearch];   
                } else {
                    logger.info(`JOB completed-- Found stuff`);
                    logger.info(`${utils.inspect(buffer, false, null)}`);
                    let res = buffer.out;
                    ans.data = [res.data, res.not_int,  res.tag, res.number_hits, res.number_on_gene];
                }            
                socket.emit('resultsSpecific', ans);           
            });
        });
    });

    socket.on('submitAllGenomes', (data)=> {
        logger.info(`socket:submitAllGenomes\n${utils.format(data)}`);

        let buf = JSON.parse('{"x" : ' + data.gi + '}');
        let gi = buf.x;
        buf = JSON.parse('{"x" : ' + data.gni + '}');
        let gni = buf.x;

        logger.info(`included genomes:\n${utils.format(gi)}`);
        logger.info(`excluded genomes:\n${utils.format(gni)}`);
        logger.info(`${utils.format(data.pam)}`);
        logger.info(`${utils.format(data.sgrna_length)}`);
        
        let jobOpt = {
            "exportVar" : {
                "rfg" : param.dataFolder,
                "gi" : gi.join('&'),
                "gni" : gni.join('&'),
                "pam" : data.pam,
                "sl" : data.sgrna_length,
                "URL_CRISPR" : param.url_vService,
                "SPECIE_REF_JSON" : param.specieRef
            },
            "modules" : ["crispr-tools"],
            "jobProfile" : "crispr-dev",
            "script" : `${param.coreScriptsFolder}/crispr_workflow.sh`
        };
        logger.info(`Trying to push ${utils.format(jobOpt)}`);
    
        let job = jobManager.push(jobOpt);
        job.on("completed",(stdout, stderr) => {
          
            let _buffer = "";
            stdout.on('data',(d)=>{_buffer += d.toString();})
                    .on('end',() => {
                        let buffer = JSON.parse(_buffer);                
                        let ans = {"data" : undefined};

                    if (buffer.hasOwnProperty("emptySearch")) {
                        logger.info(`JOB completed-- empty search\n${utils.format(buffer.emptySearch)}`);
                        ans.data = ["Search yielded no results.", buffer.emptySearch];   
                    } else {
                        let res = buffer.out;
                        logger.info(`JOB completed\n${utils.format(buffer.out)}`);
                     //   ans.data = [res.data, res.not_int,  res.tag, res.number_hits];
                         ans.data = [res.data, res.not_int,  res.tag, res.number_hits];
                    
                    }
                    socket.emit('resultsAllGenomes', ans);
                
                });
            
        });
    });

    }); // io closure

}); // jm closure