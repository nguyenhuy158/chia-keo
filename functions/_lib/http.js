export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...init.headers,
    },
  });
}

export function badRequest(message) {
  return json({ error: message }, { status: 400 });
}

export function unauthorized() {
  return json({ error: "Phiên đăng nhập không hợp lệ." }, { status: 401 });
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

