import { readLines } from "https://deno.land/std/io/mod.ts";

interface Message {
    tts?: boolean;
    nonce?: string;
    content?: string;
    embeds? : Embed[];
    message_reference?: MessageReference;
}

interface Embed {
    type?: string;
    author?: { name: string, url?: string, icon_url?: string }
    title?: string;
    description?: string;
    url?: string;
    timestamp?: string;
    color?: number;
    image?: { url: string };
    fields?: { name: string, value: string, inline?: boolean }[];
    thumbnail?: { url: string };
    footer?: { text: string, icon_url?: string }
}
interface MessageReference {
    channel_id: string;
    guild_id: string;
    message_id: string;
}
interface login {
    token?: string;
    login?: string;
    password?: string;
}

export class Client {
    private token?: string;

    public constructor() { }


    public async login(data: login) {

        if(data.token) {
            this.token = data.token;
            return;
        }else if(data.login && data.password && !data.token) {
            const request = await fetch('https://discord.com/api/v9/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    login: data.login,
                    password: data.password,
                    undelete: false,
                    captcha_key: null,
                    login_source: null,
                    gift_code_sku_id: null
                }),
            });

            const response = await request.json();

            if (request.status !== 200) {
                if (response.captcha_key === ["captcha_required"]) {
                    console.log("Captcha required");
                    return;
                }
            }

            if (response.mfa === true) {
                console.log("Please enter your 2FA code.");
                const { value: code } = await readLines(Deno.stdin).next();
                const totp = await this.totp(code, response.ticket);
                this.token = totp.token;
            } else {
                this.token = response.token;
            }

            return response;
        }else {
            console.log('Missing login, password or token!');
            return;
        }
    }

    private async totp(code: string, ticket: string) {
        const request = await fetch('https://discord.com/api/v9/auth/mfa/totp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                code: code,
                gift_code_sku_id: null,
                login_source: null,
                ticket: ticket
            })
        });

        if (request.status !== 200) {
            throw new Error(`${(request.statusText)}`);
        }

        return await request.json();
    }

    public async sendMessage(channel: string, message: string | Message) {
        if (typeof message === 'string') {
            message = { content: message };
        }

        const request = await fetch(`https://discord.com/api/v9/channels/${channel}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `${this.token}`
            },
            body: JSON.stringify(message)
        });

        if (request.status !== 200) {
            throw new Error((await request.json()).message ?? "Unknown Error")
        }

        return await request.json();
    }

    public async joinGuild(inviteLink: string | URL) {
        if (typeof inviteLink === 'string') {
            inviteLink = new URL(inviteLink);
        }
        const inviteCode = inviteLink.pathname.split('/')[1];

        const request = await fetch(`https://discord.com/api/v9/invites/${inviteCode}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `${this.token}`
            },
            body: "{}"
        });

        const response = await request.json();

        if (request.status !== 200) {
            throw new Error(`${response.message}`);
        }

        return response;
    }

    public async sendTyping(channel: string) {
        const request = await fetch(`https://discord.com/api/v9/channels/${channel}/typing`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `${this.token}`
            }
        });

        if (request.status != 204) {
            throw new Error((await request.json()).message ?? "Unknown Error")
        }
    }

    public async createThread(channel: string, message: string, name: string, archiveDuration: number) {
        const request = await fetch(`https://discord.com/api/v9/channels/${channel}/messages/${message}/threads`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `${this.token}`
            },
            body: JSON.stringify({
                name: `${name}`,
                type: 11,
                auto_archive_duration: archiveDuration,
                location: 'Message'
            })
        })

        if (request.status != 201) {
            throw new Error((await request.json()).message ?? "Unknown Error")
        }
    }

    public reactions(method: string, channel: string, message: string, emoji: string) {
        if (method === 'add') {
            return addEmoji(channel,message,emoji,this.token);
        }else if (method === 'remove') {
            return removeEmoji(channel,message,emoji,this.token);
        }else if (method === 'get') {
            return getEmoji(channel,message,emoji,this.token);
        }else {
            throw new Error('Invalid method');
        }
    }

    public async getServers() {
        const request = await fetch('https://discord.com/api/v9/users/@me/guilds', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `${this.token}`
            }
        });

        if (request.status !== 200) {
            throw new Error((await request.json()).message ?? "Unknown Error")
        }

        return await request.json();
    }

    public async getChannels(guild: string) {
        const request = await fetch(`https://discord.com/api/v9/guilds/${guild}/channels`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `${this.token}`
            }
        });

        if (request.status !== 200) {
            throw new Error((await request.json()).message ?? "Unknown Error")
        }

        return await request.json();
    }

    public async getMessages(channel: string, limit: number) {
        const request = await fetch(`https://discord.com/api/v9/channels/${channel}/messages?limit=${limit}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `${this.token}`
            }
        });

        if (request.status !== 200) {
            throw new Error((await request.json()).message ?? "Unknown Error")
        }

        return await request.json();
    }

    public async getUser(id: string) {
        const request = await fetch(`https://discord.com/api/v9/users/${id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `${this.token}`
            }
        });

        if (request.status !== 200) {
            throw new Error((await request.json()).message ?? "Unknown Error")
        }

        return await request.json();
    }

    public async getMember(guild: string, query: string) {
        const request = await fetch(`https://discord.com/api/v9/guilds/${guild}/members/search?query="${query}"`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `${this.token}`
            }
        });

        if (request.status !== 200) {
            throw new Error((await request.json()).message ?? "Unknown Error")
        }

        return await request.json();
    }
}

function addEmoji(channel: string, message: string, emoji: string, token: any) {
    const request = fetch(`https://discord.com/api/v9/channels/${channel}/messages/${message}/reactions/${emoji}/@me`, {
        method: 'PUT',
        headers: {
            'Content-type': 'application/json',
            'Authorization': `${token}`
        },
        body: '{}'
    });
    return request
}
function removeEmoji(channel: string, message: string, emoji: string, token: any) {
    const request = fetch(`https://discord.com/api/v9/channels/${channel}/messages/${message}/reactions/${emoji}/@me`, {
        method: 'DELETE',
        headers: {
            'Content-type': 'application/json',
            'Authorization': `${token}`
        },
        body: '{}'
    });
    return request;
}
function getEmoji(channel: string, message: string, emoji: string, token: any) {
    const request = fetch(`https://discord.com/api/v9/channels/${channel}/messages/${message}/reactions/${emoji}`, {
        method: 'GET',
        headers: {
            'Content-type': 'application/json',
            'Authorization': `${token}`
        },
        body: '{}'
    });
    return request;
}