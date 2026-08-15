import type { SwaggerUiOptions } from 'swagger-ui-express';

export interface ApiDocsInfo {
  title?: string;
  version?: string;
  description?: string;
  termsOfService?: string;
  contact?: {
    name?: string;
    url?: string;
    email?: string;
  };
  license?: {
    name: string;
    url?: string;
  };
}

export interface ApiDocsServer {
  url: string;
  description?: string;
  variables?: Record<
    string,
    {
      default: string;
      description?: string;
      enum?: string[];
    }
  >;
}

export interface ApiDocsOptions {
  /**
   * Swagger UI URL.
   *
   * @default "/api-docs"
   */
  path?: string;

  /**
   * OpenAPI JSON URL.
   *
   * @default "/api-docs.json"
   */
  jsonPath?: string;

  /**
   * OpenAPI information.
   */
  info?: ApiDocsInfo;

  /**
   * OpenAPI servers.
   */
  servers?: ApiDocsServer[];

  /**
   * Additional OpenAPI configuration.
   */
  openapi?: Record<string, unknown>;

  /**
   * Swagger UI configuration.
   */
  swagger?: {
    explorer?: boolean;
    customCss?: string;
    customSiteTitle?: string;
    customfavIcon?: string;
    options?: SwaggerUiOptions;
  };
}
