import prisma from "../Config/db";
import { type EventInput } from "../Types";
import { type EventType } from "../generated/prisma";

class EventService {
  async log(data: EventInput) {
    return prisma.event.create({
      data: {
        ...data,
        type: data.type as EventType
      }
    });
  }

  async logBatch(events: EventInput[]) {
    return prisma.event.createMany({
      data: events.map(event => ({
        ...event,
        type: event.type as EventType
      }))
    });
  }

  async getBySession(sessionId: string) {
    return prisma.event.findMany({
      where: { sessionId },
      orderBy: { timestamp: "asc" }
    });
  }

  async getByType(sessionId: string, type: EventType) {
    return prisma.event.findMany({
      where: {
        sessionId,
        type
      },
      orderBy: { timestamp: "asc" }
    });
  }

  async getFiltered(sessionId: string, filters: {
    type?: EventType;
    startTime?: Date;
    endTime?: Date;
    label?: string;
  }) {
    return prisma.event.findMany({
      where: {
        sessionId,
        ...(filters.type && { type: filters.type }),
        ...(filters.label && { label: { contains: filters.label } }),
        ...(filters.startTime || filters.endTime) && {
          timestamp: {
            ...(filters.startTime && { gte: filters.startTime }),
            ...(filters.endTime && { lte: filters.endTime })
          }
        }
      },
      orderBy: { timestamp: "asc" }
    });
  }

  async getStatistics(sessionId: string) {
    const events = await prisma.event.groupBy({
      by: ['type'],
      where: { sessionId },
      _count: true
    });

    const totalEvents = await prisma.event.count({
      where: { sessionId }
    });

    const firstEvent = await prisma.event.findFirst({
      where: { sessionId },
      orderBy: { timestamp: 'asc' }
    });

    const lastEvent = await prisma.event.findFirst({
      where: { sessionId },
      orderBy: { timestamp: 'desc' }
    });

    return {
      totalEvents,
      eventsByType: events,
      firstEvent,
      lastEvent
    };
  }

  async deleteBySession(sessionId: string) {
    return prisma.event.deleteMany({
      where: { sessionId }
    });
  }

  async getRecentEvents(limit: number = 10) {
    return prisma.event.findMany({
      take: limit,
      orderBy: { timestamp: 'desc' },
      include: {
        session: {
          include: {
            candidate: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });
  }
}

export default EventService;
