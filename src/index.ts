//imports

import express, { Request, Response } from "express";
import "dotenv/config";
import http, { IncomingMessage } from "http";
import { WebSocketServer } from "ws";
import { checkIsInContacts, msgSenderHelper } from "./msgUtils.js";
import { MessageData, MyWebSocket, Users } from "./types.js";
import { restoringUserMessages, validateExistingUser } from "./utils.js";
import { supabase } from "./supabase.js";
//configs
const app = express();
app.use(express.json());
const server = http.createServer(app);
// stored Data Area

const activeClients = new Map<string, MyWebSocket>();
const users: Users = {
  Pedro: { contacts: [] },
  Pepe: { contacts: ["Walter White"] },
  "Walter White": { contacts: ["Pepe"] },
};

const wss = new WebSocketServer({ server });

// const validateContactsWithMsg = (
//   reciever: string,
//   sender: string,
//   userWs: MyWebSocket,
//   recieverWs?: MyWebSocket
// ) => {
//   const { recieverCheck, senderCheck } = checkIsInContacts(
//     reciever,
//     sender,
//     users
//   );

//   if (!senderCheck) {
//     console.log("Entro en la condicion: SenderCheck falso");
//     !users[sender] || !users[sender].contacts.length
//       ? (users[sender] = { contacts: [reciever] })
//       : users[sender].contacts.push(reciever);
//     userWs.send(JSON.stringify({ type: "new-contact", contact: reciever }));
//   }
//   if (!recieverCheck) {
//     console.log("Entro en la condicion: ReceiverCheck falso");
//     !users[reciever] || !users[reciever].contacts.length
//       ? (users[reciever] = { contacts: [sender] })
//       : users[reciever].contacts.push(sender);
//     recieverWs &&
//       recieverWs.send(JSON.stringify({ type: "new-contact", contact: sender }));
//   }
// };
// WebSocket Server Area
wss.on("connection", (ws: MyWebSocket, req: IncomingMessage) => {
  // In this area is where the code for connected users is
  ws.on("message", async function asyncmessage(data: any) {
    //Here, it checks when a message reaches the web socket server
    const parsedData = JSON.parse(data);

    //Here, it checks if the message is an auth type or a msg type, and applies the respective logic for each case
    if (parsedData.type === "auth") {
      console.log("Tipo recibido: auth");
      const user = parsedData.from;
      // Setting the new user as an active user in the ActiveClients Map
      activeClients.set(user, ws);
      // This function checks if the newly connected user already exists in the Users object and sends a notification to the user
      validateExistingUser(user, ws);

      // Sending messages history to new connected user and updating messages status from "sent" to "delivered"
      restoringUserMessages(user, ws);
    } else if (parsedData.type === "msg") {
      console.log("\nTipo recibido: msg\n");
      console.log({ parsedData });
      //Definimos id ,receptor y emisor del mensaje
      const id = parsedData.id;
      const reciever = parsedData.to;
      const sender = parsedData.from;

      //Buscamos el ws del receptor para utilizarlo en la busqueda de contacto y envio de mensaje
      const recieverWs = msgSenderHelper(activeClients, reciever);
      if (!supabase) return;
      //Revisamos si los usuarios se tienen como contacto en la base de datos
      try {
        const { error, status } =
          supabase &&
          (await supabase.from("users_contacts").upsert(
            [
              { user_id: sender, contact_id: reciever },
              { user_id: reciever, contact_id: sender },
            ],
            { onConflict: "user_id,contact_id" }
          ));
        error && console.error(error);
        //Si no estan en la base de datos como contactos, se notifica al frontend de que agregue el nuevo contacto
        if (status === 201) {
          console.log(sender, "tiene nuevo contacto. Se llama", reciever);

          ws.send(JSON.stringify({ type: "new-contact", contact: reciever }));
          if (!recieverWs) {
            console.log(
              reciever,
              "no esta activo. Actualizando contacto cuando se conecte"
            );
          } else {
            recieverWs.send(
              JSON.stringify({ type: "new-contact", contact: sender })
            );
          }
        }
      } catch (error) {
        console.log("Error en el tryCatch de agregar contacto");
        console.error(error);
      }

      /*
      Posiblemente se pueda optimizar aqui, usando un tryCatch y modificando el flujo del estado del mensaje,
      
      */

      if (supabase) {
        const { data, error } = await supabase.from("messages").insert({
          id: id,
          date: parsedData.date,
          from: sender,
          to: reciever,
          message: parsedData.message,
          status: parsedData.status,
        });
        console.log("post guradado supabase: ", data, error);
        if (!error) {
          ws.send(JSON.stringify({ type: "new-msg", message: parsedData }));
          recieverWs &&
            recieverWs.send(
              JSON.stringify({ type: "new-msg", message: parsedData })
            );
        } else {
          console.error(error);
        }
      }
    } else if (parsedData.type === "status-update") {
      if (!supabase) return;
      const ids = parsedData.ids || [];
      const status = parsedData.status || "seen";
      const sender = parsedData.sender || ""; // usuario original que envió el mensaje
      const receiver = parsedData.receiver || ""; // usuario que lo recibió

      // Actualiza en DB
      const DBdata = await supabase
        .from("messages")
        .update({ status })
        .in("id", ids);

      console.log("DB status-update: ", DBdata);

      // Enviar confirmación AL SENDER ORIGINAL (no al receiver)
      if (sender) {
        const senderWs = msgSenderHelper(activeClients, sender);
        senderWs?.send(
          JSON.stringify({
            type: "status-update",
            ids,
            status,
          })
        );
      }
    }
  });

  ws.on("close", (e: any) => {
    const done = activeClients.delete(ws.user!);
    if (!done) {
      console.log(
        "Parece que algo fallo al cerrar la conexion de: ",
        ws.user || "unknown"
      );
    } else {
      console.log(`Conexion del usuario ${ws.user} cerrada`);
    }
  });
});

/* 
Express Area 
*/

app.get("/", (req: Request, res: Response) => {
  const activeClientsArray: string[] = [];
  activeClients.forEach((val, key) => {
    activeClientsArray.push(key);
  });
  console.log({ activeClientsArray, activeClients });

  res.send({ activeClientsArray, users });
});

app.get("/save_users", async (req: Request, res: Response) => {
  return res.send("HOLA");
});
app.get("/messages", (req: Request, res: Response) => {
  res.send("messages");
});
server.listen(process.env.PORT, () => {
  console.log(`La app esta corriendo en el puerto ${process.env.PORT}\n
    ws://http://localhost:${process.env.PORT}/`);
});
