import prompt from 'prompt';
import { Service } from 'typedi';
import fs from 'fs/promises';
import path from 'path';

import { consoleRewrite } from '../helpers/console';
import { SearchService } from './search.service';
import { ItemService } from './item.service';
import { example } from '../constants/payload-example';
import { AuthService } from './auth.service';

@Service()
export class AppService {
  constructor(
    private readonly authService: AuthService,
    private readonly searchService: SearchService,
    private readonly itemService: ItemService,
  ) {}

  async bootstrap() {
    console.log('๐ EBS ๋จ์ถ ๋ฌธ์  ํฌ๋กค๋ง ์์!');

    try {
      let input = {
        username: process.env.EBS_USERNAME as string,
        password: process.env.EBS_PASSWORD as string,
      };

      if (!(input.username && input.password)) {
        console.log('โ๏ธ ๋ก๊ทธ์ธ ์ ๋ณด๋ฅผ ์๋ ฅํ์ธ์.');
        prompt.start();
        input = await prompt.get([
          {
            properties: {
              username: { message: 'EBS ID' },
            },
          },
          {
            properties: {
              password: {
                message: 'EBS PASSWORD',
                hidden: true,
              },
            },
          },
        ]);
      }

      consoleRewrite('โณ ๋ก๊ทธ์ธ ์ค์๋๋ค ...');

      await this.authService.authorization(input);

      for (const [title, payload] of Object.entries(example)) {
        const searchResult = await this.searchService.search(payload);

        console.log(`\nโ ${searchResult.length}๊ฐ ๋ฌธ์ ๋ฅผ ์ฐพ์์ต๋๋ค! (${title})`);
        consoleRewrite('โณ ์์ธ์ ๋ณด๋ฅผ ๊ฒ์ํ๋ ์ค์๋๋ค ...');

        const itemSet: { [k: string]: any } = {};
        for (const { item_id, item_number } of searchResult) {
          const { name, number, answer, groupId, question, explanation, category } =
            await this.itemService.getItemById(item_id);
          const { passage, explanation: passageExplanation } = await this.itemService.getItemsById(
            item_id,
          );

          if (!(groupId in itemSet)) {
            itemSet[groupId] = { type: null, properties: {}, children: [] };
          }

          if (passage) {
            itemSet[groupId] = {
              ...itemSet[groupId],
              type: 'passage',
              properties: {},
              metadata: { passage, explanation: passageExplanation },
              children: [
                ...itemSet[groupId].children,
                {
                  type: 'question',
                  number: number || item_number, // ์ฐ๋์ ๋ฐ๋ฅธ ๋๋ฝ ๋ฐ์ดํฐ ์ฒ๋ฆฌ
                  properties: {
                    name,
                    answer,
                    category,
                    imageUrl: `${process.env.S3_URL || 'https://s3.seodaang.com'}/${title}/q${
                      number || item_number
                    }.png`,
                  },
                  metadata: { question, explanation },
                },
              ],
            };
          } else {
            // groupId ์๋ ๊ฒฝ์ฐ item_id๋ก ์ฒ๋ฆฌ
            itemSet[groupId || item_id] = {
              type: 'question',
              number: number || item_number, // ์ฐ๋์ ๋ฐ๋ฅธ ๋๋ฝ ๋ฐ์ดํฐ ์ฒ๋ฆฌ
              properties: {
                name,
                answer,
                category,
                imageUrl: `${process.env.S3_URL || 'https://s3.seodaang.com'}/${title}/q${
                  number || item_number
                }.png`,
              },
              metadata: { question, explanation },
            };
          }
        }

        const groups = Object.values(itemSet);
        // ๋ด๋ถ ์ ๋ ฌ
        groups
          .filter((group) => group.type === 'passage')
          .forEach((group) => group.children.sort((a, b) => +a.number - +b.number));

        // ์ ์ฒด ์ ๋ ฌ
        groups.sort((a, b) => {
          const p = a.type === 'passage' ? +a.children[0].number : +a.number;
          const q = b.type === 'passage' ? +b.children[0].number : +b.number;
          return p - q;
        });

        // passage ์์๋ก URL ๋งคํ (์ ๋ ฌ ์ ์๋ ๋ณ๋ค๋ฅธ ์์ ์ ๋ณด๊ฐ ์๊ธฐ ๋๋ฌธ์ ์ฌ๊ธฐ์ ์ฒ๋ฆฌ)
        let passageNumber = 1;
        groups.forEach((group) => {
          if (group.type === 'passage') {
            group.properties.imageUrl = `${
              process.env.S3_URL || 'https://s3.seodaang.com'
            }/${title}/p${passageNumber++}.png`;
          }
        });

        const dirPath = path.join(__dirname, `../../../dataset/${title}/`);
        await fs.mkdir(dirPath, { recursive: true });
        await fs.writeFile(
          path.join(dirPath, 'result.json'),
          JSON.stringify({
            title: title.split('/').join(' '),
            grade: payload.grade,
            month: payload.category[0].month,
            year: payload.category[0].year,
            content: groups,
          }),
        );

        consoleRewrite('โ ์์ธ์ ๋ณด ๊ฒ์์๋ฃ');
      }

      console.log('\n\n ๐ ๋ชจ๋  ์์์ ์๋ฃํ์์ต๋๋ค!');
    } catch (err) {
      console.error(err);
    }
  }
}
