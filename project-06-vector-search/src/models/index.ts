export type { ITextDocument } from './textDocument.schema';
export { TEXT_DOCUMENTS_INIT } from './textDocument.schema';

export type { IImage } from './image.schema';
export { IMAGES_INIT } from './image.schema';

export interface IEmbeddedMovie {
  _id?: any;
  title: string;
  year: number;
  plot: string;
  plot_embedding: Buffer;  // Pre-embedded by MongoDB Atlas
  genres: string[];
  cast: string[];
  directors: string[];
  runtime: number;
  imdb: {
    rating: number;
    votes: number;
  };
}