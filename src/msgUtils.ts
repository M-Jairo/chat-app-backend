import WebSocket from "ws";
import { MessageData, Users } from "./types.js";

interface MyWebSocket extends WebSocket {
  user?: string;
}
// Por ahora sin uso
export const messageBodyCreator = (
  from: string,
  message: string,
  date: Date,
  to?: string
) => {
  type msgBody = {
    type: "msg";
    from: string;
    message: string;
    date: Date;
    to?: string;
  };

  const body: msgBody = {
    type: "msg",
    from: from,
    message: message,
    date: date || "",
  };
  if (to || to !== "") {
    body.to = to;
  }
};

export const msgSenderHelper = (
  clients: Map<string, MyWebSocket>,
  to: string
): MyWebSocket | undefined => {
  if (to && to !== "") {
    const toUser = clients.get(to);
    return toUser;
  }
  // console.log(clients, typeof clients)
};

export const addNewContact = (data: MessageData, users: Users) => {
  console.log(`\n Msg from ${data.from}`);
  console.log(data, users);
  const reciever = data.to;
};

export const checkIsInContacts = (
  to: string,
  from: string,
  usersList: Users
) => {
  const recieverCheck = usersList[to]
    ? usersList[to].contacts.includes(from)
    : undefined;
  const senderCheck = usersList[from]
    ? usersList[from].contacts.includes(to)
    : undefined;

  // console.log("User to check contacts: ", to);
  // console.log("User that sended the msg: ", from);
  // console.log(
  //   `El emisor ${from} tiene a ${to} en sus contactos? Respuesta: ${senderCheck}`
  // );
  // console.log(
  //   `El receptor ${to} tiene a ${from} en sus contactos? Respuesta: ${recieverCheck}`
  // );
  // console.log(recieverCheck, "\n", senderCheck);

  return { recieverCheck, senderCheck };
};

export const filterMessages = (
  to: string,
  from: string,
  messages: MessageData[]
) => {};
