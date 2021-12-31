import { Client } from './module/client.ts';
import { exists} from "https://deno.land/std/fs/mod.ts"
import { readLines } from "https://deno.land/std/io/mod.ts";
import { cliClient } from './client.ts';

const client = new Client();
const decoder = new TextDecoder('utf-8')

exists('./settings.json').then(async (result) => {
    if (result) {
        let settings:any = decoder.decode(await Deno.readFile('./settings.json'));
        settings = JSON.parse(settings);
        if(settings.token){
            client.login({ token: settings.token })
            await openClient();
        }else {
            return login();
        }
    }else {
        return login();
    }
});

async function login() {
    console.log('You are not logged in.');
    console.log('Please enter your email adress:');
    const login = await readLines(Deno.stdin).next();
    await console.log('Please enter your password:');
    const password = await readLines(Deno.stdin).next();
    console.log(await client.login({ login: login.value, password: password.value }));
}

function openClient(){
    cliClient(client);
}