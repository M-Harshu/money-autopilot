import {NextResponse} from "next/server"; import {runSimulation} from "@/lib/simulation/engine"; export async function POST(){return NextResponse.json(await runSimulation(500))}
