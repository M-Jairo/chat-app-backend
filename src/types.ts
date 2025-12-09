import WebSocket from "ws";
export type wsReqData = {};
export type MessageData =
  | {
      type: "msg"; // Mensaje normal
      from: string;
      id: string;
      to: string; // <— requerido
      message: string;
      date: Date;
      status: "sent" | "delivered" | "seen";
      ids?: never;

    }
  | {
      type: "auth"; // Mensaje de autenticación
      from: string;
      message: string;
      date: Date;
      id: never;
      ids: never;
      to: never; // <— explícitamente prohibido
      status: never;
    }
  | {
      type: "status-update";
      from: never;
      to: never;
      ids: string[];
      id:never
      message: never;
      date: never;
      status: "sent" | "delivered" | "seen";
    };
export type msgUpdate = { type: "status-update"; id: string };
export interface MyWebSocket extends WebSocket {
  user?: string;
}

export type User = {
  contacts: string[];
};
export type Users = {
  [username: string]: User;
};
