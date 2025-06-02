<script setup lang="ts">
import Tabs from '~/components/ui/tabs/Tabs.vue'
import TabsList from '~/components/ui/tabs/TabsList.vue'
import TabsTrigger from '~/components/ui/tabs/TabsTrigger.vue'
import TabsContent from '~/components/ui/tabs/TabsContent.vue'
import Input from '~/components/ui/input/Input.vue'
import Textarea from '~/components/ui/textarea/Textarea.vue'
import Button from '~/components/ui/button/Button.vue'
import Card from '~/components/ui/card/Card.vue'
import CardContent from '~/components/ui/card/CardContent.vue'
import CardFooter from '~/components/ui/card/CardFooter.vue'
import CardHeader from '~/components/ui/card/CardHeader.vue'
import CardTitle from '~/components/ui/card/CardTitle.vue'
import CardDescription from '~/components/ui/card/CardDescription.vue'
import Label from '~/components/ui/label/Label.vue'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronLeft } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

const router = useRouter()
function handleBack() {
  router.push('/crm/pipeline')
}
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Pipeline</h1>
        <p class="text-muted-foreground">Manage your sales pipeline and leads</p>
      </div>
      <div class="flex gap-2">
        <Button variant="outline">
          <Icon name="lucide:download" class="mr-2 h-4 w-4" />
          Export
        </Button>
        <NuxtLink to="/crm/pipeline">
          <Button>
            <Icon name="lucide:arrow-left" class="mr-2 h-4 w-4" />
            Back
          </Button>
        </NuxtLink>
      </div>
    </div>
    <Card class="border-none">
      <CardContent class="p-0">
        <Tabs default-value="lead" class="w-full mt-4">
          <div class="flex items-center justify-between mb-2">
            <TabsList class="w-full max-w-md">
              <TabsTrigger value="lead" class="flex-1">Lead</TabsTrigger>
              <TabsTrigger value="contact" class="flex-1">Contato</TabsTrigger>
              <TabsTrigger value="company" class="flex-1">Empresa</TabsTrigger>
              <TabsTrigger value="meeting" class="flex-1">Reunião</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="lead">
            <Card class="border">
              <CardHeader>
                <CardTitle>Lead Information</CardTitle>
                <CardDescription>Fill in the main details about the lead.</CardDescription>
              </CardHeader>
              <CardContent class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="space-y-2">
                    <Label for="lead-name">Nome do Lead</Label>
                    <Input id="lead-name" placeholder="Digite o nome do lead" />
                  </div>
                  <div class="space-y-2">
                    <Label for="lead-source">Origem</Label>
                    <Select>
                      <SelectTrigger id="lead-source" class="w-full">
                        <SelectValue placeholder="Selecione a origem" class=""/>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="website">Website</SelectItem>
                        <SelectItem value="referral">Indicação</SelectItem>
                        <SelectItem value="social">Redes Sociais</SelectItem>
                        <SelectItem value="event">Evento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div class="space-y-2">
                    <Label for="lead-status">Status</Label>
                    <Select>
                      <SelectTrigger id="lead-status">
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">Novo</SelectItem>
                        <SelectItem value="contacted">Contatado</SelectItem>
                        <SelectItem value="qualified">Qualificado</SelectItem>
                        <SelectItem value="proposal">Proposta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div class="space-y-2">
                    <Label for="lead-value">Valor Estimado</Label>
                    <Input id="lead-value" placeholder="R$ 0,00" type="text" />
                  </div>
                  <div class="space-y-2 md:col-span-2">
                    <Label for="lead-notes">Observações</Label>
                    <Textarea id="lead-notes" placeholder="Adicione observações sobre o lead" rows="3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="contact" class="space-y-4 mt-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="contact-name">Nome do Contato</Label>
                <Input id="contact-name" placeholder="Digite o nome do contato" />
              </div>
              <div class="space-y-2">
                <Label for="contact-email">Email</Label>
                <Input id="contact-email" placeholder="email@exemplo.com" type="email" />
              </div>
              <div class="space-y-2">
                <Label for="contact-phone">Telefone</Label>
                <Input id="contact-phone" placeholder="(00) 00000-0000" />
              </div>
              <div class="space-y-2">
                <Label for="contact-position">Cargo</Label>
                <Input id="contact-position" placeholder="Cargo do contato" />
              </div>
              <div class="space-y-2 md:col-span-2">
                <Label for="contact-notes">Observações</Label>
                <Textarea id="contact-notes" placeholder="Adicione observações sobre o contato" rows="3" />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="company" class="space-y-4 mt-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="company-name">Nome da Empresa</Label>
                <Input id="company-name" placeholder="Digite o nome da empresa" />
              </div>
              <div class="space-y-2">
                <Label for="company-segment">Segmento</Label>
                <Select>
                  <SelectTrigger id="company-segment">
                    <SelectValue placeholder="Selecione o segmento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technology">Tecnologia</SelectItem>
                    <SelectItem value="finance">Finanças</SelectItem>
                    <SelectItem value="healthcare">Saúde</SelectItem>
                    <SelectItem value="education">Educação</SelectItem>
                    <SelectItem value="retail">Varejo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="space-y-2">
                <Label for="company-size">Tamanho da Empresa</Label>
                <Select>
                  <SelectTrigger id="company-size">
                    <SelectValue placeholder="Selecione o tamanho" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-10">1-10 funcionários</SelectItem>
                    <SelectItem value="11-50">11-50 funcionários</SelectItem>
                    <SelectItem value="51-200">51-200 funcionários</SelectItem>
                    <SelectItem value="201-500">201-500 funcionários</SelectItem>
                    <SelectItem value="501+">501+ funcionários</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="space-y-2">
                <Label for="company-website">Website</Label>
                <Input id="company-website" placeholder="www.exemplo.com.br" />
              </div>
              <div class="space-y-2 md:col-span-2">
                <Label for="company-address">Endereço</Label>
                <Input id="company-address" placeholder="Endereço da empresa" />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="meeting" class="space-y-4 mt-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="meeting-date">Data</Label>
                <Input id="meeting-date" type="date" />
              </div>
              <div class="space-y-2">
                <Label for="meeting-time">Horário</Label>
                <Input id="meeting-time" type="time" />
              </div>
              <div class="space-y-2">
                <Label for="meeting-type">Tipo de Reunião</Label>
                <Select>
                  <SelectTrigger id="meeting-type">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presential">Presencial</SelectItem>
                    <SelectItem value="virtual">Virtual</SelectItem>
                    <SelectItem value="phone">Telefone</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="space-y-2">
                <Label for="meeting-duration">Duração (minutos)</Label>
                <Input id="meeting-duration" type="number" placeholder="30" />
              </div>
              <div class="space-y-2 md:col-span-2">
                <Label for="meeting-agenda">Pauta</Label>
                <Textarea id="meeting-agenda" placeholder="Descreva a pauta da reunião" rows="3" />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter class="flex justify-end space-x-2 py-5">
        <Button variant="outline">Cancelar</Button>
        <Button>Salvar Lead</Button>
      </CardFooter>
    </Card>
  </div>
</template> 