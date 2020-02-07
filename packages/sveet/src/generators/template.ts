import { readFile, readFile$ } from "../utils/fs";
import { Observable } from "rxjs";

type TemplateOptions = {
  templatePath: string;
};

export const build = (options: TemplateOptions): Promise<Buffer> => {
  return readFile(options.templatePath);
};

export const watch = (options: TemplateOptions): Observable<Buffer> => {
  return readFile$(options.templatePath);
};
