import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button } from './button';

/**
 * components/ui/button.stories.tsx
 *
 * Story é documentação executável: ele roda no Storybook, no teste visual e no
 * review. Por isso o objeto `args` declara o contrato do componente (props
 * obrigatórias e padrões) uma única vez, e as stories só variam o que muda.
 *
 * @fileoverview Stories do botão (catálogo do Storybook).
 * @module components/ui/button.stories
 * @dependencies @storybook/nextjs-vite (Meta, StoryObj), components/ui/button.
 */
const meta = {
  title: 'UI/Button',
  component: Button,
  args: {
    children: 'Salvar',
    variant: 'default',
    size: 'default',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'outline', 'ghost', 'destructive', 'link'],
    },
    size: {
      control: 'select',
      options: ['sm', 'default', 'lg', 'icon'],
    },
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Outline: Story = {
  args: { variant: 'outline' },
};

export const Destructive: Story = {
  args: { variant: 'destructive', children: 'Excluir' },
};

export const Disabled: Story = {
  args: { disabled: true },
};

/** O botão como link: o `asChild` preserva a semântica de navegação. */
export const AsLink: Story = {
  args: { asChild: true },
  render: (args) => (
    <Button {...args}>
      <a href="/exemplo">Ir para o exemplo</a>
    </Button>
  ),
};
