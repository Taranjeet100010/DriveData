var aws = require("aws-sdk");
let request = require("request");

aws.config.update({
    region: "eu-west-1",
    secretAccessKey: "",
    accessKeyId: "",
})

const s3Bucket = new aws.S3({ params: { Bucket: 'taranjeet10' } });

exports.uploadImageAwsThroughUrl = async (url, type) => {
    console.log("urlv : ", url, "Type :", type)
    if (!type) {
        type = "pdf"
    }
    return new Promise((resolve, reject) => {
        let name = `${new Date().getTime()}.${type}`;

        request({
            url: url,
            encoding: null
        }, function (err, res, body) {
            if (err) {
                reject(err);
            }
            s3Bucket.putObject({
                Bucket: 'taranjeet10',
                Key: name,
                ContentType: res.headers['content-type'],
                ContentLength: res.headers['content-length'],
                Body: body
            }, (err, data) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(name);
                }
            })
        })

    })
}