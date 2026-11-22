// Re-export of the canonical MessageId brand.
// The brand lives in the channel domain (src/model/channel/message.ts);
// the message domain must reuse it, never redefine it.
export { MessageId } from "@/model/channel/message";
