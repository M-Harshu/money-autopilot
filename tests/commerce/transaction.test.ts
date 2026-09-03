import {describe,it,expect} from "vitest"; import {assertTransition,canTransition} from "@/lib/commerce/transaction";
describe("transaction state machine",()=>{it("allows pending to success",()=>expect(canTransition("PENDING","SUCCESS")).toBe(true));it("blocks success to pending",()=>expect(()=>assertTransition("SUCCESS","PENDING")).toThrow())})
