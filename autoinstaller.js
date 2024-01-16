const fs = require('fs');
const axios = require('axios');
const readline = require('readline-sync');
const { exec } = require('child_process');

let files = {}
const P = ['\\', '|', '/', '-'];
let x = 0;
global.nbedited = 0;
async function getaddon() {
    const transactionid = readline.question('BETA: Enter your license (If you bought it on BuiltByBits check your discution): ');
    const loader = setInterval(() => {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        process.stdout.write(`Search for the transaction ${transactionid} (This can take some seconds) ${P[x++]}`);
        x %= P.length;
    }, 250);
    const req = axios.get('https://api.bagou450.com/index.php/api/client/pterodactyl/checkIfExist', {params : {id: transactionid}}).then(res => {
        clearInterval(loader)
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        process.stdout.write("Transaction found ✅");
        if (res.status >= 400) {
            process.stdout.write(`\n This license is invalid i can't install any addon with that `);
            process.exit(1)
        }
        process.stdout.write(`\n\x1b[1m\x1b[33mWARNING: \x1b[0m THIS INSTALLER HAVE SMALL CHANCE TO BRICK YOUR PANEL (if this happend contact me on discord). I'M NOT RESPONSIBLE FOR ANY DAMAGE`);
        const goodaddon = readline.question(`\nHello ${res.data['buyer']}. You want to install "${res.data['fullname'].replace('  ', '')}" right (y/n)? `);
        if (goodaddon == 'y' || goodaddon == 'yes') {
            process.stdout.write(`\nPerfect! I go to launch the installation one moment.`);
            const theme = readline.question(`\nDo you have a theme (y/n)? `);
            if(theme == 'y' || theme == 'yes') {
                startinstall(transactionid, res.data['name'], true)
            } else if (theme == 'n' || theme == 'no') {
                startinstall(transactionid, res.data['name'], false)
            } else {
                process.stdout.write(`\n\x1b[31m\x1b[1mERROR: \x1b[0mPlease enter yes/y/no/n.`);
                process.exit(1)
            }
        } else {
            process.stdout.write(`\n\x1b[31m\x1b[1mERROR: \x1b[0mI can find only that so contact me on discord.`);
            process.exit(1)
        }
    })  .catch(error => {
        clearInterval(loader)
        try {
            process.stdout.write(`\n ${error.data['message']}`);
        } catch {
            console.log(error)
        }
        process.exit(1)

    });

}

async function startinstall(transaction, name, theme) {
    const loader = setInterval(() => {
        console.clear()
        process.stdout.cursorTo(0);
        process.stdout.write(`Get installation program of ${name} (This can take some seconds) ${P[x++]}`);
        x %= P.length;
    }, 250);
    const req = axios.get(`https://api.bagou450.com/index.php/api/client/pterodactyl/getautoinstaller?id=${transaction}&selectaddon=${name}`).then(async res => {
        clearInterval(loader)
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        process.stdout.write("Installer downloaded ✅\n");
        const files = res.data
        const nbofedit = Object.keys(files).length;
        const load = setInterval(() => {
            if(nbofedit <= nbedited) {
                clearInterval(load)
                process.stdout.moveCursor(0, -1)
                process.stdout.clearLine(1)
                process.stdout.write(`Instalation done ✅\n`);
                buildassets()
            }
            process.stdout.moveCursor(0, -1)
            process.stdout.clearLine(1)
            process.stdout.write(`Instalation in progress please wait... (This can take some seconds) ${P[x++]}\n`);
            x %= P.length;
        }, 250);
        for (file in files) {
            await doedit(files, file, theme)
        }
    })  .catch(error => {
        clearInterval(loader)
        try {
            process.stdout.write(`\n \x1b[31m\x1b[1mERROR: \x1b[0m${error.data['message']}`);
        } catch {
            console.log(error)
        }
        process.exit(1)
    });

}
function doedit(files, file, theme) {
    if(files[file][0]['type'] != "newfile" && files[file][0]['type'] != "folder") {
        setTimeout(() => {
            fs.readFile(file, 'utf8', function read(err, data) {
                if (err) {
                    process.stdout.write(`\n\x1b[31m\x1b[1m❌ ERROR DURING EDITING ${file}. (STEP 1)\x1b[0m`);
                    process.exit(1);
                }
                let content = data
                for (edit in files[file]) {
                    if(!theme && files[file][edit]['theme'] == 'no' || files[file][edit]['theme'] == 'any') {
                        if (files[file][edit]['type'] === 'above' && content.indexOf(files[file][edit]['add']) === -1) {
                            content = content.replace(files[file][edit]['where'], `${files[file][edit]['add']}\n${files[file][edit]['where']}`)
                        } else if (files[file][edit]['type'] === 'under' && content.indexOf(files[file][edit]['add']) === -1) {
                            content = content.replace(files[file][edit]['where'], `${files[file][edit]['where']}\n${files[file][edit]['add']}`)
                        } else if (files[file][edit]['type'] === 'replace' && content.indexOf(files[file][edit]['add']) === -1) {
                            content = content.replace(files[file][edit]['where'], files[file][edit]['add'])
                        } else if (files[file][edit]['type'] === 'newfile') {
                            content = content = files[file][edit]['add']
                        }
                    } else if(theme && files[file][edit]['theme'] == 'yes' || files[file][edit]['theme'] == 'any') {
                        if (files[file][edit]['type'] === 'above' && content.indexOf(files[file][edit]['add']) === -1) {
                            content = content.replace(files[file][edit]['where'], `${files[file][edit]['add']}\n${files[file][edit]['where']}`)
                        } else if (files[file][edit]['type'] === 'under' && content.indexOf(files[file][edit]['add']) === -1) {
                            content = content.replace(files[file][edit]['where'], `${files[file][edit]['where']}\n${files[file][edit]['add']}`)
                        } else if (files[file][edit]['type'] === 'replace' && content.indexOf(files[file][edit]['add']) === -1) {
                            content = content.replace(files[file][edit]['where'], files[file][edit]['add'])
                        } else if (files[file][edit]['type'] === 'newfile') {
                            content = content = files[file][edit]['add']
                        }
                    }



                }
                fs.writeFile(file, content, (err) => {
                    if (err) {
                        process.stdout.write(`\n\x1b[31m\x1b[1m❌ ERROR DURING EDITING ${file}. (STEP 3)\n`);

                        process.exit(1);
                    }
                    global.nbedited ++

                });
            });

        }, 2000)


    } else if (files[file][0]['type'] != "newfile" && files[file][0]['type'] == "folder") {
        fs.mkdir(file, (err) => {
            global.nbedited ++

        });
        global.nbedited ++
    } else {
        setTimeout(() => {
            fs.writeFile(file, files[file][0]['add'], (err) => {
                if (err) {
                    process.stdout.write(`\n\x1b[31m\x1b[1m❌ ERROR DURING EDITING ${file}. (STEP 4)\x1b[0m\n`);


                    process.exit(1);
                }
                global.nbedited ++

            });
        }, 2000);

    }

}
function buildassets() {
    process.stdout.write('\n')
    const load = setInterval(() => {
        process.stdout.moveCursor(0, -1)
        process.stdout.clearLine(1)
        process.stdout.write(`Build panel assets (this can take some minutes)... ${P[x++]}\n`);
        x %= P.length;
    }, 250);
    exec('yarn install && yarn add html-react-parser && yarn build:production && chown -R www-data:www-data * && php artisan route:clear && php artisan cache:clear && php artisan migrate --seed --force', (err, stdout, stderr) => {
        if (err) {
            process.stdout.write(`\n\x1b[31m\x1b[1m❌ ERROR DURING ASSET BUILDING. (STEP 5)\n Run the yarn build:production command after screen the result and send it with your transaction id to contact@bagou450.com\x1b[0m\n`);
            process.exit(1);

        }
        process.stdout.moveCursor(0, -1)
        process.stdout.clearLine(1)
        process.stdout.write(`Build panel assets done ✅\n`);
        clearInterval(load)
        process.stdout.write("Addon installed successfully ✅\n");
    });


}
getaddon()

