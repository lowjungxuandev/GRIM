import { getMessaging } from "firebase-admin/messaging";
import type { App } from "firebase-admin/app";
import type { ResultNotifier } from "../../api/v1/model/services.model";

/** Default FCM topic name; clients must subscribe with the same string (see Firebase topic messaging). */
export const DEFAULT_FCM_BROADCAST_TOPIC = "grim_new_result";

export class FirebaseNotifier implements ResultNotifier {
  constructor(
    private readonly firebaseApp: App,
    private readonly broadcastTopic: string = DEFAULT_FCM_BROADCAST_TOPIC
  ) {}

  async broadcastNewResult(): Promise<void> {
    await getMessaging(this.firebaseApp).send({
      topic: this.broadcastTopic,
      data: { kind: "new_result" }
    });
  }
}
