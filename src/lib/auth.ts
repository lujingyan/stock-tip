import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

const SECRET_KEY = new TextEncoder().encode(
    process.env.JWT_SECRET || 'default-secret-key-change-me'
);

const ALG = 'HS256';

export async function hashPassword(password: string) {
    return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
    return await bcrypt.compare(password, hash);
}

export async function createSession(userId: number) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const session = await new SignJWT({ userId })
        .setProtectedHeader({ alg: ALG })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(SECRET_KEY);

    (await cookies()).set('session', session, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        expires: expiresAt,
        sameSite: 'lax',
        path: '/',
    });
}

export async function getSession() {
    const session = (await cookies()).get('session')?.value;
    if (!session) return null;

    try {
        const { payload } = await jwtVerify(session, SECRET_KEY, {
            algorithms: [ALG],
        });
        return payload.userId as number;
    } catch (error) {
        return null;
    }
}

export async function logout() {
    (await cookies()).delete('session');
}
