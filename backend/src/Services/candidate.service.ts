import prisma from "../Config/db";
import { type CandidateInput } from "../Types";

class CandidateService {
  async create(data: CandidateInput) {
    return prisma.candidate.create({ data });
  }

  async getAll() {
    return prisma.candidate.findMany({
      include: {
        sessions: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            integrityScore: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getById(id: string) {
    return prisma.candidate.findUnique({
      where: { id },
      include: {
        sessions: {
          include: {
            events: {
              select: {
                id: true,
                type: true,
                timestamp: true,
                label: true
              }
            },
            reports: true
          }
        }
      }
    });
  }

  async update(id: string, data: Partial<CandidateInput>) {
    return prisma.candidate.update({
      where: { id },
      data
    });
  }

  async delete(id: string) {
    return prisma.candidate.delete({ where: { id } });
  }

  async getByEmail(email: string) {
    return prisma.candidate.findUnique({ where: { email } });
  }
}

export default CandidateService;
