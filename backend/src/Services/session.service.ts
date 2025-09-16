import prisma from "../Config/db";
import { type SessionInput } from "../Types";

class SessionService {
  async create(data: SessionInput) {
    return prisma.session.create({
      data,
      include: { candidate: true }
    });
  }

  async end(id: string, integrityScore: number) {
    const session = await prisma.session.findUnique({ where: { id } });
    if (!session) return null;

    const duration = session.startTime
      ? Math.floor((new Date().getTime() - session.startTime.getTime()) / 1000)
      : null;

    return prisma.session.update({
      where: { id },
      data: {
        endTime: new Date(),
        integrityScore,
        duration
      },
      include: {
        candidate: true,
        events: true
      }
    });
  }

  async getById(id: string) {
    return prisma.session.findUnique({
      where: { id },
      include: {
        candidate: true,
        events: {
          orderBy: { timestamp: 'asc' }
        },
        reports: true
      }
    });
  }

  async getAll() {
    return prisma.session.findMany({
      include: {
        candidate: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            events: true,
            reports: true
          }
        }
      },
      orderBy: { startTime: 'desc' }
    });
  }

  async getByCandidate(candidateId: string) {
    return prisma.session.findMany({
      where: { candidateId },
      include: {
        events: {
          select: {
            id: true,
            type: true,
            timestamp: true
          }
        },
        reports: true
      },
      orderBy: { startTime: 'desc' }
    });
  }

  async updateVideoUrl(id: string, videoUrl: string) {
    return prisma.session.update({
      where: { id },
      data: { videoUrl },
      include: { candidate: true }
    });
  }

  async getActive() {
    return prisma.session.findMany({
      where: { endTime: null },
      include: {
        candidate: true,
        events: {
          orderBy: { timestamp: 'desc' },
          take: 5
        }
      }
    });
  }

  async calculateIntegrityScore(sessionId: string): Promise<number> {
    const events = await prisma.event.findMany({
      where: { sessionId }
    });

    let score = 100;
    const deductions = {
      LOOKING_AWAY: 5,
      NO_FACE: 10,
      MULTIPLE_FACES: 20,
      OBJECT_DETECTED: 15,
      EYE_CLOSED: 5,
      AUDIO_SUSPICIOUS: 10
    };

    for (const event of events) {
      const deduction = deductions[event.type as keyof typeof deductions] || 0;
      score -= deduction;
    }

    return Math.max(0, Math.min(100, score));
  }
}

export default SessionService;