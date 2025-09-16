import prisma from "../Config/db";
import { type ReportInput, type Candidate, type Session, type Event, type SessionStatistics } from "../Types";
import PDFDocument from "pdfkit";

interface ReportData {
  candidate: Candidate;
  session: Session;
  events: Event[];
  statistics: SessionStatistics;
  integrityScore: number;
}

class ReportService {
  async create(data: ReportInput) {
    return prisma.report.create({ data });
  }

  async getBySession(sessionId: string) {
    return prisma.report.findMany({
      where: { sessionId },
      orderBy: { generatedAt: 'desc' }
    });
  }

  async getById(id: string) {
    return prisma.report.findUnique({ where: { id } });
  }

  async delete(id: string) {
    return prisma.report.delete({ where: { id } });
  }

  async getReportData(sessionId: string): Promise<ReportData> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        candidate: true,
        events: {
          orderBy: { timestamp: 'asc' }
        }
      }
    });

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const eventStats = await prisma.event.groupBy({
      by: ['type'],
      where: { sessionId },
      _count: true
    });

    const duration = session.endTime && session.startTime
      ? Math.floor((session.endTime.getTime() - session.startTime.getTime()) / 1000)
      : session.duration || 0;

    return {
      candidate: session.candidate,
      session: {
        ...session,
        duration
      },
      events: session.events,
      statistics: {
        totalEvents: session.events.length,
        eventsByType: eventStats.map(stat => ({
          type: stat.type,
          count: stat._count
        })),
        duration
      },
      integrityScore: session.integrityScore || 100
    };
  }

  generatePDF(reportData: ReportData): Buffer {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    // Header
    doc.fontSize(20).text('Interview Proctoring Report', { align: 'center' });
    doc.moveDown();

    // Candidate Information
    doc.fontSize(14).text('Candidate Information', { underline: true });
    doc.fontSize(12);
    doc.text(`Name: ${reportData.candidate.name}`);
    doc.text(`Email: ${reportData.candidate.email || 'N/A'}`);
    doc.moveDown();

    // Session Details
    doc.fontSize(14).text('Session Details', { underline: true });
    doc.fontSize(12);
    doc.text(`Session ID: ${reportData.session.id}`);
    doc.text(`Start Time: ${new Date(reportData.session.startTime).toLocaleString()}`);
    doc.text(`End Time: ${reportData.session.endTime ? new Date(reportData.session.endTime).toLocaleString() : 'Ongoing'}`);
    doc.text(`Duration: ${this.formatDuration(reportData.session.duration || 0)}`);
    doc.text(`Video URL: ${reportData.session.videoUrl || 'Not recorded'}`);
    doc.moveDown();

    // Integrity Score
    doc.fontSize(14).text('Assessment Results', { underline: true });
    doc.fontSize(12);
    doc.text(`Integrity Score: ${reportData.integrityScore}/100`);
    doc.text(`Total Events Detected: ${reportData.statistics.totalEvents}`);
    doc.moveDown();

    // Event Statistics
    doc.fontSize(14).text('Event Breakdown', { underline: true });
    doc.fontSize(12);
    reportData.statistics.eventsByType.forEach((stat) => {
      doc.text(`${this.formatEventType(stat.type)}: ${stat.count} occurrences`);
    });
    doc.moveDown();

    // Event Timeline
    doc.fontSize(14).text('Event Timeline', { underline: true });
    doc.fontSize(10);
    reportData.events.slice(0, 50).forEach(event => {
      doc.text(
        `[${new Date(event.timestamp).toLocaleTimeString()}] ${this.formatEventType(event.type)}` +
        `${event.label ? ' - ' + event.label : ''}` +
        `${event.confidence ? ' (Confidence: ' + (event.confidence * 100).toFixed(0) + '%)' : ''}`
      );
    });

    if (reportData.events.length > 50) {
      doc.text(`... and ${reportData.events.length - 50} more events`);
    }

    doc.end();

    return Buffer.concat(chunks);
  }

  generateCSV(reportData: ReportData): string {
    const csvData = [];

    // Header section
    csvData.push(['Interview Proctoring Report']);
    csvData.push([]);
    csvData.push(['Candidate Information']);
    csvData.push(['Name', reportData.candidate.name]);
    csvData.push(['Email', reportData.candidate.email || 'N/A']);
    csvData.push([]);

    // Session section
    csvData.push(['Session Details']);
    csvData.push(['Session ID', reportData.session.id]);
    csvData.push(['Start Time', new Date(reportData.session.startTime).toLocaleString()]);
    csvData.push(['End Time', reportData.session.endTime ? new Date(reportData.session.endTime).toLocaleString() : 'Ongoing']);
    csvData.push(['Duration', this.formatDuration(reportData.session.duration || 0)]);
    csvData.push(['Integrity Score', reportData.integrityScore]);
    csvData.push([]);

    // Event statistics
    csvData.push(['Event Statistics']);
    csvData.push(['Event Type', 'Count']);
    reportData.statistics.eventsByType.forEach((stat) => {
      csvData.push([this.formatEventType(stat.type), stat.count]);
    });
    csvData.push([]);

    // Event timeline
    csvData.push(['Event Timeline']);
    csvData.push(['Timestamp', 'Event Type', 'Label', 'Confidence', 'Duration']);
    reportData.events.forEach(event => {
      csvData.push([
        new Date(event.timestamp).toLocaleString(),
        this.formatEventType(event.type),
        event.label || '',
        event.confidence ? (event.confidence * 100).toFixed(0) + '%' : '',
        event.duration || ''
      ]);
    });

    // Convert 2D array to CSV string
    return csvData.map(row => row.map(cell => {
      // Escape cells containing commas or quotes
      if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(',')).join('\n');
  }

  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  formatEventType(type: string): string {
    const formatMap: Record<string, string> = {
      LOOKING_AWAY: 'Looking Away',
      NO_FACE: 'No Face Detected',
      MULTIPLE_FACES: 'Multiple Faces',
      OBJECT_DETECTED: 'Suspicious Object',
      EYE_CLOSED: 'Eyes Closed',
      AUDIO_SUSPICIOUS: 'Suspicious Audio'
    };
    return formatMap[type] || type;
  }
}

export default ReportService;