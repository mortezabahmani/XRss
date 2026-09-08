export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return new Response("XRSS Active", { status: 200 });
  },
};

export interface Env {
  ENVIRONMENT: string;
}
