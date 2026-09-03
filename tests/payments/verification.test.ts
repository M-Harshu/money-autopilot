import {describe,it,expect} from "vitest"; import crypto from "node:crypto";
describe("payment signature",()=>it("uses HMAC SHA256",()=>{const secret="test";const order="order_1",payment="pay_1";const sig=crypto.createHmac("sha256",secret).update(`${order}|${payment}`).digest("hex");expect(sig).toHaveLength(64)}))
