import { Request, Response } from 'express';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { ConversionService } from '../conversion-service/conversion-service';
import type { UMLModel } from '@tumaet/apollon';

export class ConversionResource {
  conversionService: ConversionService = new ConversionService();

  convert = async (req: Request, res: Response) => {
    res.status(200);
    let model: UMLModel | undefined;

    if(req.body.model) {
      model = req.body.model;
    }

    if (req.body) {
      // Support both {model: {...}} and direct model payload
      model = req.body.model || req.body;
      if (typeof model === 'string') {
        model = JSON.parse(model);
      }
      console.log('Received model for conversion:', model);
      const { svg, clip } = await this.conversionService.convertToSvg(model as UMLModel);
      const { width, height } = clip;

      pdfMake.vfs = pdfFonts.vfs;

      const doc = pdfMake.createPdf({
        content: [
          {
            svg,
          },
        ],
        pageSize: { width, height },
        pageMargins: 0,
      });

      const stream = await doc.getStream();
      res.type('application/pdf');
      stream.pipe(res);
      stream.end();
    } else {
      res.status(400).send({ error: 'Model must be defined!' });
    }
  };

  status = (req: Request, res: Response) => {
    res.sendStatus(200);
  };
}
