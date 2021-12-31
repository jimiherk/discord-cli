import { Gateway } from './module/gateway.ts';
import { read } from './readInput.ts';
import * as Colors from 'https://deno.land/std/fmt/colors.ts';
Deno.writeTextFile('./cache.json', '{"channel": "", "server": ""}');

export function cliClient(client: any) {
    const gateway = new Gateway(client.token);
    gateway.addEventListener('READY', (eClient: any) => {
        console.clear();
        let tag = `${(eClient as CustomEvent).detail.user.username}#${(eClient as CustomEvent).detail.user.discriminator}`
        console.log(`Logged in as ${tag}`);
        console.log(`View your servers by typing /servers`);
        listenForCommand(client, tag, gateway);
    })
}

async function listenForCommand(client: any, tag: string, gateway: any) {
    let input = await read();
    if (input.value.startsWith('/')) {
        let command = input.value.replaceAll('/', '');
        if (command === 'servers') {
            let servers: any = await client.getServers();
            for (let i = 0; i<servers.length;i++) {
                let server: any = servers[i];
                console.log(`${i+1}. ${server.name}`);
            }
            console.log('What server do you want to switch to?');
            let server: any = await read();
            await switchToServer(server, servers);
            listenForCommand(client, tag, gateway);
        }else if (command === 'channels') {
            let cache = JSON.parse(await Deno.readTextFile('./cache.json'));
            let channels: any = await client.getChannels(cache.server);
            for (let i = 0; i<channels.length;i++) {
                let channel: any = channels[i];
                if (!channel.bitrate) {
                    console.log(`${i+1}. #${channel.name}`);
                }
            }
            console.log('What channel do you want to switch to?');
            let channel: any = await read();
            switchToChannel(channel, channels, client, tag);
            gateway.addEventListener('MESSAGE_CREATE', (e: any) => {
                let message = (e as CustomEvent).detail;
                recieveMessage(message, tag);
            })
            listenForCommand(client, tag, gateway);
        }else {
            console.log('Unknown command');
            listenForCommand(client, tag, gateway);
        }
    }else {
        let cache = JSON.parse(await Deno.readTextFile('./cache.json'));
        await client.sendMessage(cache.channel, input.value);
    }
}

async function checkForPing(data: any, client:any) {
    data = data.split(' ');
    for (let i = 0; i<data.length;i++) {
        if (data[i].startsWith('<@!') && data[i].endsWith('>')) {
            data[i] = data[i].replace('<@!', '').replace('>', '');
            data[i] = await client.getUser(data[i]);
            data[i] = `@${data[i].username}#${data[i].discriminator}`;
        }
    }
    return await data.join(' ');
}

async function switchToServer(server: any, servers: any) {
    server = servers[parseFloat(server.value) - 1];
    let cache = JSON.parse(await Deno.readTextFile('./cache.json'));
    cache.server = server.id;
    Deno.writeTextFile('./cache.json', JSON.stringify(cache));
    console.clear();
    console.log(`You've switched to ${server.name}`);
    console.log('View your channels by typing /channels');
}
async function switchToChannel(channel: any, channels: any, client: any, tag: string) {
    channel = channels[parseFloat(channel.value) - 1];

    console.clear();
    console.log(`You've switched to #${channel.name}`);
    let messages: any = await client.getMessages(channel.id, 100);
    messages.reverse();
    for (const message of messages) {
        message.content = await checkForPing(message.content, client);
        if (message.content.includes(tag) || message.content.includes(`@everyone`) || message.content.includes(`@here`)) {
            console.log(Colors.red(`${message.author.username}#${message.author.discriminator}: ${message.content}`));
        }else {
            console.log(`${message.author.username}#${message.author.discriminator}: ${message.content}`);
        }
    }
    let cache = JSON.parse(await Deno.readTextFile('./cache.json'));
    cache.channel = channel.id;
    Deno.writeTextFile('./cache.json', JSON.stringify(cache));
}

async function recieveMessage(message: any, tag: string) {
    let cache = JSON.parse(await Deno.readTextFile('./cache.json'));
    if (message.channel_id === cache.channel) {
        if (message.content.includes(tag) || message.content.includes(`@everyone`) || message.content.includes(`@here`)) {
            console.log(Colors.red(`${message.author.username}#${message.author.discriminator}: ${message.content}`));
        }else {
            console.log(`${message.author.username}#${message.author.discriminator}: ${message.content}`);
        }
    }
}