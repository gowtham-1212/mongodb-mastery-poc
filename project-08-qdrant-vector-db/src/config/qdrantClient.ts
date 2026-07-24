import { QdrantClient } from '@qdrant/js-client-rest';

// REST API endpoint (Port 6333)
export const qdrant = new QdrantClient({ url: 'http://localhost:6333', checkCompatibility: false});