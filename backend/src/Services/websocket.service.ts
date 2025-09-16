import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import EventService from './event.service';
import { type EventInput, type WebSocketMessage } from '../Types';

interface WSClient {
  id: string;
  ws: WebSocket;
  sessionId?: string;
  role: 'candidate' | 'interviewer';
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WSClient> = new Map();
  private eventService = new EventService();

  initialize(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientId = this.generateClientId();
      const client: WSClient = {
        id: clientId,
        ws,
        role: 'candidate'
      };

      this.clients.set(clientId, client);
      console.log(`WebSocket client connected: ${clientId}`);

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleMessage(clientId, message);
        } catch (error) {
          console.error('Error handling message:', error);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format'
          }));
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`WebSocket client disconnected: ${clientId}`);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
      });

      // Send connection confirmation
      ws.send(JSON.stringify({
        type: 'connected',
        clientId
      }));
    });
  }

  private async handleMessage(clientId: string, message: WebSocketMessage) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'join_session':
        await this.handleJoinSession(client, message);
        break;

      case 'leave_session':
        await this.handleLeaveSession(client);
        break;

      case 'event':
        await this.handleEvent(client, message);
        break;

      case 'batch_events':
        await this.handleBatchEvents(client, message);
        break;

      case 'ping':
        client.ws.send(JSON.stringify({ type: 'pong' }));
        break;

      default:
        client.ws.send(JSON.stringify({
          type: 'error',
          message: `Unknown message type: ${message.type}`
        }));
    }
  }

  private async handleJoinSession(client: WSClient, message: WebSocketMessage) {
    const { sessionId, role } = message;

    if (!sessionId) {
      client.ws.send(JSON.stringify({
        type: 'error',
        message: 'Session ID is required'
      }));
      return;
    }

    client.sessionId = sessionId;
    client.role = role || 'candidate';

    // Notify other clients in the same session
    this.broadcastToSession(sessionId, {
      type: 'user_joined',
      clientId: client.id,
      role: client.role
    }, client.id);

    client.ws.send(JSON.stringify({
      type: 'joined_session',
      sessionId
    }));
  }

  private async handleLeaveSession(client: WSClient) {
    if (!client.sessionId) return;

    const sessionId = client.sessionId;
    client.sessionId = undefined;

    // Notify other clients in the same session
    this.broadcastToSession(sessionId, {
      type: 'user_left',
      clientId: client.id,
      role: client.role
    }, client.id);

    client.ws.send(JSON.stringify({
      type: 'left_session',
      sessionId
    }));
  }

  private async handleEvent(client: WSClient, message: WebSocketMessage) {
    if (!client.sessionId) {
      client.ws.send(JSON.stringify({
        type: 'error',
        message: 'Must join a session first'
      }));
      return;
    }

    if (!message.data) {
      client.ws.send(JSON.stringify({
        type: 'error',
        message: 'Event data is required'
      }));
      return;
    }

    const eventData: EventInput = {
      sessionId: client.sessionId,
      type: message.data.type,
      label: message.data.label,
      confidence: message.data.confidence,
      duration: message.data.duration,
      meta: message.data.meta
    };

    try {
      const event = await this.eventService.log(eventData);

      // Broadcast to all clients in the session
      this.broadcastToSession(client.sessionId, {
        type: 'event',
        data: event
      });

      // Send real-time alert for critical events
      if (this.isCriticalEvent(eventData.type)) {
        this.broadcastToSession(client.sessionId, {
          type: 'alert',
          severity: 'high',
          message: `Critical event detected: ${eventData.type}`,
          event
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      client.ws.send(JSON.stringify({
        type: 'error',
        message: `Failed to log event: ${errorMessage}`
      }));
    }
  }

  private async handleBatchEvents(client: WSClient, message: WebSocketMessage) {
    if (!client.sessionId) {
      client.ws.send(JSON.stringify({
        type: 'error',
        message: 'Must join a session first'
      }));
      return;
    }

    if (!message.events || !Array.isArray(message.events)) {
      client.ws.send(JSON.stringify({
        type: 'error',
        message: 'Events array is required'
      }));
      return;
    }

    const events: EventInput[] = message.events.map(e => ({
      ...e,
      sessionId: client.sessionId!
    }));

    try {
      const result = await this.eventService.logBatch(events);

      // Broadcast summary to all clients in the session
      this.broadcastToSession(client.sessionId!, {
        type: 'batch_events_logged',
        count: result.count
      });

      // Check for critical events
      const criticalEvents = events.filter(e => this.isCriticalEvent(e.type));
      if (criticalEvents.length > 0) {
        this.broadcastToSession(client.sessionId!, {
          type: 'alert',
          severity: 'high',
          message: `${criticalEvents.length} critical events detected`,
          events: criticalEvents
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      client.ws.send(JSON.stringify({
        type: 'error',
        message: `Failed to log batch events: ${errorMessage}`
      }));
    }
  }

  private isCriticalEvent(type: string): boolean {
    const criticalTypes = ['MULTIPLE_FACES', 'OBJECT_DETECTED', 'NO_FACE'];
    return criticalTypes.includes(type);
  }

  private broadcastToSession(sessionId: string, message: Record<string, unknown>, excludeClientId?: string) {
    this.clients.forEach((client) => {
      if (client.sessionId === sessionId && client.id !== excludeClientId) {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(JSON.stringify(message));
        }
      }
    });
  }

  broadcast(message: Record<string, unknown>) {
    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    });
  }

  sendToClient(clientId: string, message: Record<string, unknown>) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  getSessionClients(sessionId: string): WSClient[] {
    const clients: WSClient[] = [];
    this.clients.forEach((client) => {
      if (client.sessionId === sessionId) {
        clients.push(client);
      }
    });
    return clients;
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getActiveSessionsCount(): number {
    const sessions = new Set<string>();
    this.clients.forEach((client) => {
      if (client.sessionId) {
        sessions.add(client.sessionId);
      }
    });
    return sessions.size;
  }

  getTotalClientsCount(): number {
    return this.clients.size;
  }
}

export default new WebSocketService();