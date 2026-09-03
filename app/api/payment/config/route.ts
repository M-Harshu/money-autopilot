import {NextResponse} from "next/server"; import {env} from "@/lib/env/server"; export async function GET(){return NextResponse.json({keyId:env().RAZORPAY_KEY_ID})}
