import { Component, OnInit } from '@angular/core';
import { Client } from '@stomp/stompjs';
import * as SockJS from 'sockjs-client';

//Models
import { Message } from 'src/app/models/message.model';

//Constants
const URL_CHAT_ENDPOINT: string = "http://localhost:8080/chat-websocket";
const URL_CHAT_MESSAGE: string = "/chat/message";
const URL_MESSAGE: string = "/app/message";
const URL_CHAT_TYPING = "/chat/typing";
const URL_TYPING: string = "/app/typing";
const URL_CHAT_HISTORY: string = "/chat/history/";
const URL_HISTORY: string = "/app/history";
const ID = "id-";

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit {
  //Privates
  private client: Client;

  //Publics
  connected: boolean;
  message: Message;
  messages: Message[];
  typing: string;
  clientId: string;

  //Public constants
  NEW_USER: string = 'NEW_USER';
  MESSAGE: string = 'MESSAGE';

  constructor() {
    this.connected = false;
    this.message = new Message();
    this.messages = [];
    this.clientId = ID
                    .concat(new Date().getTime().toString())
                    .concat('-')
                    .concat(Math.random().toString(36).substr(2));
  }

  ngOnInit(): void {
    this.initClient();
    this.onConnect();
    this.onDisconnect();
  }

  //Init client
  private initClient(): void{
    this.client = new Client();
    this.client.webSocketFactory = () => {
      return new SockJS(URL_CHAT_ENDPOINT);
    }
  }

  //Event onConnect
  private onConnect():void {
    this.client.onConnect = (frame) => {
      this.connected = true;
      console.log('Connected : ' + this.client.connected + " : " + frame);

      //Subscribe mesage
      this.client.subscribe(URL_CHAT_MESSAGE, e => {
        let message: Message = JSON.parse(e.body) as Message;
        message.date = new Date(message.date);

        if(!this.message.color && message.type == this.NEW_USER && this.message.username == message.username){
          this.message.color = message.color;
        }

        this.messages.push(message);
        console.log(message);
      });

      //Subscribe typing
      this.client.subscribe(URL_CHAT_TYPING, e => {
        this.typing = e.body;
        setTimeout(() => this.typing = '', 3000);
      });

      //Subscribe history
      this.client.subscribe(URL_CHAT_HISTORY.concat(this.clientId), e => {
        const history = JSON.parse(e.body) as Message[];
        this.messages = history.map(m => {
          m.date = new Date(m.date);
          return m;
        }).reverse();
      });

      this.client.publish({destination: URL_HISTORY, body: this.clientId});

      this.message.type = this.NEW_USER;
      this.client.publish({destination: URL_MESSAGE, body: JSON.stringify(this.message)});
    }
  }

  //Event onDisconnect
  private onDisconnect(): void{
    this.client.onDisconnect = (frame) => {
      this.connected = false;
      console.log('Disconnected : ' + !this.client.connected + " : " + frame);

      this.message = new Message();
      this.messages = [];
    }
  }

  //Connect
  public connect(): void{
    this.client.activate();
  }

  //Disconnect
  public disconnect(): void {
    this.client.deactivate();
    this.message.username = '';
  }

  //Send a message
  public sendMessage(): void{
    this.message.type = this.MESSAGE;
    this.client.publish({destination: URL_MESSAGE, body: JSON.stringify(this.message)});
    this.message.text = '';
  }

  //Event someone is typing
  public someoneIsTyping(): void{
    this.client.publish({destination: URL_TYPING, body: this.message.username});
  }
}
