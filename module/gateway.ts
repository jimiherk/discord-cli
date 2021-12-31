enum GatewayOpcodes {
  Dispatch = 0,
  Heartbeat = 1,
  Identify = 2,
  PresenceUpdate = 3,
  VoiceStateUpdate = 4,
  Resume = 6,
  Reconnect = 7,
  RequestGuildMembers = 8,
  InvalidSession = 9,
  Hello = 10,
  HeartbeatACK = 11,
}

interface GatewayOptions {
  encoding: "json";
  v: number;
  compress?: "zlib-stream";
}

export class Gateway extends EventTarget {
    private readonly token: string;
    private connection: WebSocket;
    private sequenceNumber: number | null = null;

    public constructor(
        token: string,
        options: GatewayOptions = { encoding: "json", v: 9 }
    ) {
        super();

        this.token = token;
        const url = new URL("wss://gateway.discord.gg");
        url.searchParams.append("encoding", options.encoding);
        url.searchParams.append("v", options.v.toString());
        if (options.compress) {
            url.searchParams.append("compress", options.compress);
        }

        this.connection = new WebSocket(url.toString());

        this.connection.onmessage = (message) => {
            const data = JSON.parse(message.data);
            this.sequenceNumber = data.s;
            if (data.t) {
                this.dispatchEvent(new CustomEvent(data.t, {detail: data.d}));
            }
            switch (data.op) {
                case GatewayOpcodes.Hello:
                    const heartbeat_interval = data.d.heartbeat_interval;
                    this.heartbeat(heartbeat_interval);
                    this.identify();
                    break;
            }
        }
    }

    private heartbeat(interval: number) {
        setInterval(() => {
            this.connection.send(JSON.stringify({
                op: GatewayOpcodes.Heartbeat,
                d: this.sequenceNumber,
            }));
        }, interval);
    }

    private identify() {
        this.connection.send(JSON.stringify({
            op: GatewayOpcodes.Identify,
            d: {
                token: this.token,
                properties: {
                    os: "Windows",
                    browser: "Firefox",
                    device: "",
                    system_locale: "de",
                    browser_user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:95.0) Gecko/20100101 Firefox/95.0",
                    browser_version: "95.0",
                    os_version: "10",
                    referrer: "",
                    referring_domain: "",
                    referrer_current: "",
                    referring_domain_current: "",
                    release_channel: "stable",
                    client_build_number: 108924,
                    client_event_source: null,
                },
                presence: {
                    status: "online",
                    since: 0,
                    activities: [],
                    afk: false,
                },
                compress: false,
                client_state: {
                    guild_hashes: {},
                    highest_last_message_id: "0",
                    read_state_version: 0,
                    user_guild_settings_version: -1,
                    user_settings_version: -1,
                },
            },
        }));
    }

    public joinVoiceChannel(guildId: string, channelId: string) {
        this.connection.send(JSON.stringify({
            op: GatewayOpcodes.VoiceStateUpdate,
            d: {
                guild_id: guildId,
                channel_id: channelId,
                self_mute: false,
                self_deaf: false,
                self_video: false,
            },
        }));
    }
}