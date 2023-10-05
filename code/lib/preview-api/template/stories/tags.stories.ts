import { within, expect } from '@storybook/test';
import { global as globalThis } from '@storybook/global';
import type { PartialStoryFn, PlayFunctionContext, StoryContext } from '@storybook/types';

export default {
  component: globalThis.Components.Pre,
  tags: ['component-one', 'component-two'],
  decorators: [
    (storyFn: PartialStoryFn, context: StoryContext) => {
      return storyFn({
        args: { object: { tags: context.tags } },
      });
    },
  ],
};

export const Inheritance = {
  tags: ['story-one', 'story-two'],
  play: async ({ canvasElement }: PlayFunctionContext<any>) => {
    const canvas = within(canvasElement);
    await expect(JSON.parse(await canvas.getByTestId('pre').innerText)).toEqual({
      tags: ['story-one', 'story-two', 'story'],
    });
  },
};
