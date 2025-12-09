import {
  PostgrestResponse,
  PostgrestSingleResponse,
} from "@supabase/supabase-js";
import { supabase } from "./supabase.js";

import { MessageData, MyWebSocket, Users } from "./types.js";

export const validateExistingUser = async (
  user: string,
  userWs: MyWebSocket
) => {
  if (!supabase) return;
  const { data, error } =
    supabase &&
    (await supabase
      .from("users_contacts")
      .select("contact_id")
      .eq(`user_id`, user));
  error && console.error("Error en validateExistingUser: ", error);
  // console.log(data);
  if (data) {
    const contacts = data.map((cnt) => cnt.contact_id);
    console.log("Usuario existe de antes");
    userWs.send(
      JSON.stringify({
        type: "auth",
        message: "Autenticacion recibida || Usuario existente",
        contacts: contacts,
      })
    );
  } else {
    userWs.send(
      JSON.stringify({
        auth: {
          type: "auth",
          message: "Autenticacion recibida || Nuevo usuario almacenado",
        },
      })
    );
  }
};
export const restoringUserMessages = async (
  user: string,
  userWs: MyWebSocket
) => {
  if (!supabase || !user) return;
  const Sdata: PostgrestSingleResponse<
    {
      id: string;
      date: Date;
      from: string;
      to: string;
      message: string;
      status: string;
    }[]
  > = await supabase
    .from("messages")
    .select()
    .or(`from.eq.${user},to.eq.${user}`);
  if (Sdata.error) {
    console.error("Error al traer datos de supabase: ", Sdata.error);
    return;
  }

  if (!Sdata.data.length || Sdata.data === undefined || !Sdata.data) {
    console.log(user, "No tiene mensajes");
    return;
  }
  const sortedByDateMessages = Sdata.data.sort((msgA, msgB) => {
    const a = new Date(msgA.date);
    const b = new Date(msgB.date);
    return a.getTime() - b.getTime();
  });
  let idsUpdate: string[] = [];
  const finalMsgs = sortedByDateMessages.map((msg) => {
    if (msg.from !== user && msg.to === user && msg.status === "sent") {
      // msg.status = "delivered";
      idsUpdate.push(msg.id);
    }
    return msg;
  });
 
  userWs.send(JSON.stringify({ type: "message-history", messages: finalMsgs }));
  await supabase
    .from("messages")
    .update({ status: "delivered" })
    .in("id", idsUpdate);
  return;
};
