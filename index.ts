import { execSync } from 'child_process';
import { readdirSync, statSync } from 'fs';
import { v4 as uuid} from 'uuid';

console.clear();
console.log(`[+] PhotoCopy process started`);

// Config
const Config = {

    // Run as soon as the program starts
    initialExecution: true,

    // Delay until next execution
    hourDelay: 1,

    // Which directory to search for images (DO NOT USE A DIRECTORY THAT PARENTS YOUR BACKUP DIRECTORY)
    searchDir: '/volume1/homes',

    // Where to backup images
    backupDir: '/volume1/photos',

    // How many images to backup at a time
    maxTasks: 10,

    // Which extentions should be backed up
    allowedExtensions: [
        'jpg',
        'jpeg',
        'png',
        'gif',
        'tiff',
    ],

    // Subfolders to ignore
    disallowedStrings: [
        'node_modules',
        'cache',
        'thumbnails',
        'thumbs',
        'thumb',
        'public',
        'public_html',
        'sprites',
        'spritesheet',
        'www',
        'htdocs',
    ]
}

function run() {

    console.log(`[%] Scouting for new images...`);

    // Keep track of images to backup
    let images = [];

    // Find images
    const scout = (dir = Config.searchDir) => {

        const files = readdirSync(dir);

        for (const file of files) {

            const path = `${dir}/${file}`;

            // Search deeper
            if (statSync(path).isDirectory()) {
                return scout(path);
            }

            // Ensure file is an image
            if (!Config.allowedExtensions.includes(file.split('.').pop())) return;

            // Ensure file is not a disallowed string
            if (Config.disallowedStrings.some(str => file.includes('/' + str + '/'))) return;

            // Add image to list
            console.log(`[+] Located image ${path}`);
            images.push(path);


        }

    }

    // Start scouting
    scout();

    console.log(`[%] Copying images...`);

    // Keep track of batch count
    let batchCount = 0;

    function batch() {

        let batchMembers = images.slice(0, Config.maxTasks);
        images = images.slice(Config.maxTasks);

        if (!batchMembers.length) return console.log(`[+] All images copied`);
        console.log(`[%] Copying batch ${batchCount++}`);

        Promise.all(
            batchMembers.map(async image =>
                new Promise<void>(resolve => {
                    
                    const id = uuid() + '.' + image.split('.').pop();

                    console.log(`[@] ${image} -> ${Config.backupDir}/${id}`);

                    execSync(`rsync -za "${image}" "${Config.backupDir}/${id}"`);
                    resolve();
                })
            )
        )
            .then(batch);

    }

    // Start batching
    batch();

}

if (Config.initialExecution) run();

setInterval(() => {
    console.log(`[+] Executing`);
    run();
}, 1000 * 60 * 60 * Config.hourDelay);