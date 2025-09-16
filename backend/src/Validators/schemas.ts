import { z } from "zod";

// Candidate schemas
export const createCandidateSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required").max(100),
    email: z.string().email("Invalid email format").optional()
  })
});

export const updateCandidateSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    email: z.string().email("Invalid email format").optional()
  })
});

// Session schemas
export const createSessionSchema = z.object({
  body: z.object({
    candidateId: z.string().cuid("Invalid candidate ID"),
    videoUrl: z.string().url("Invalid video URL").optional()
  })
});

export const endSessionSchema = z.object({
  body: z.object({
    integrityScore: z.number().min(0).max(100).optional()
  })
});

export const updateSessionVideoSchema = z.object({
  body: z.object({
    videoUrl: z.string().url("Invalid video URL")
  })
});

// Event schemas
export const eventTypeEnum = z.enum([
  "LOOKING_AWAY",
  "NO_FACE",
  "MULTIPLE_FACES",
  "OBJECT_DETECTED",
  "EYE_CLOSED",
  "AUDIO_SUSPICIOUS"
]);

export const createEventSchema = z.object({
  body: z.object({
    sessionId: z.string().cuid("Invalid session ID"),
    type: eventTypeEnum,
    label: z.string().max(255).optional(),
    confidence: z.number().min(0).max(1).optional(),
    duration: z.number().int().positive().optional(),
    meta: z.any().optional()
  })
});

export const batchEventsSchema = z.object({
  body: z.object({
    events: z.array(z.object({
      sessionId: z.string().cuid("Invalid session ID"),
      type: eventTypeEnum,
      label: z.string().max(255).optional(),
      confidence: z.number().min(0).max(1).optional(),
      duration: z.number().int().positive().optional(),
      meta: z.any().optional()
    })).min(1, "At least one event is required").max(100, "Maximum 100 events allowed")
  })
});

export const filterEventsSchema = z.object({
  query: z.object({
    type: eventTypeEnum.optional(),
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
    label: z.string().optional()
  })
});

// Report schemas
export const createReportSchema = z.object({
  body: z.object({
    sessionId: z.string().cuid("Invalid session ID"),
    format: z.enum(["pdf", "csv", "json"])
  })
});

// Upload schemas
export const uploadVideoUrlSchema = z.object({
  body: z.object({
    url: z.string().url("Invalid video URL")
  })
});

// Pagination schemas
export const paginationSchema = z.object({
  query: z.object({
    page: z.string().transform(Number).default(1),
    limit: z.string().transform(Number).default(10),
    sortBy: z.string().optional(),
    order: z.enum(["asc", "desc"]).default("desc")
  })
});

// ID param schemas
export const idParamSchema = z.object({
  params: z.object({
    id: z.string().cuid("Invalid ID format")
  })
});

export const sessionIdParamSchema = z.object({
  params: z.object({
    sessionId: z.string().cuid("Invalid session ID")
  })
});

export const candidateIdParamSchema = z.object({
  params: z.object({
    candidateId: z.string().cuid("Invalid candidate ID")
  })
});