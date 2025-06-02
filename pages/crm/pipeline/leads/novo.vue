<script setup lang="ts">
import { ref } from 'vue'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Stepper, StepperDescription, StepperItem, StepperSeparator, StepperTitle, StepperTrigger } from '@/components/ui/stepper'
import Button from '~/components/ui/button/Button.vue'
import Card from '~/components/ui/card/Card.vue'
import CardContent from '~/components/ui/card/CardContent.vue'
import CardDescription from '~/components/ui/card/CardDescription.vue'
import CardHeader from '~/components/ui/card/CardHeader.vue'
import CardTitle from '~/components/ui/card/CardTitle.vue'
import Input from '~/components/ui/input/Input.vue'
import Label from '~/components/ui/label/Label.vue'
import Textarea from '~/components/ui/textarea/Textarea.vue'
import { Check, Circle, Dot } from 'lucide-vue-next'

const steps = [
  {
    step: 1,
    title: 'Lead',
    description: 'Lead information (required)',
    required: true,
  },
  {
    step: 2,
    title: 'Contact',
    description: 'Contact details (required)',
    required: true,
  },
  {
    step: 3,
    title: 'Company',
    description: 'Company info (optional)',
    required: false,
  },
  {
    step: 4,
    title: 'Meeting',
    description: 'Meeting details (optional)',
    required: false,
  },
]

const step = ref(0)
const totalSteps = steps.length

function nextStep() {
  if (step.value < totalSteps - 1) {
    step.value++
  }
}
function prevStep() {
  if (step.value > 0) {
    step.value--
  }
}
</script>

<template>
  <div>
    <div class="mb-8 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">New Lead</h1>
        <p class="text-muted-foreground">Create a new lead</p>
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
    <div class="flex flex-col md:flex-row gap-8">
      <!-- Stepper Sidebar -->
      <div class="md:w-1/5 w-full flex flex-col items-center md:items-start">
        <Stepper v-model="step" orientation="vertical" class="mx-auto flex w-full max-w-md flex-col justify-start gap-10">
          <StepperItem
            v-for="(item, index) in steps"
            :key="index"
            v-slot="{ state }"
            class="relative flex w-full items-start gap-6"
            :step="index"
          >
            <StepperSeparator
              v-if="index !== steps.length - 1"
              class="absolute left-[18px] top-[38px] block h-[105%] w-0.5 shrink-0 rounded-full bg-muted group-data-[state=completed]:bg-primary"
            />
            <StepperTrigger as-child>
              <Button
                :variant="state === 'completed' || state === 'active' ? 'default' : 'outline'"
                size="icon"
                class="z-10 rounded-full shrink-0"
                :class="[state === 'active' && 'ring-2 ring-ring ring-offset-2 ring-offset-background']"
              >
                <Check v-if="state === 'completed'" class="size-5" />
                <Circle v-else-if="state === 'active'" />
                <Dot v-else />
              </Button>
            </StepperTrigger>
            <div class="flex flex-col gap-1">
              <StepperTitle
                :class="[state === 'active' && 'text-primary']"
                class="text-sm font-semibold transition lg:text-base"
              >
                {{ item.title }}<span v-if="item.required" class="text-xs text-destructive ml-1">*</span>
              </StepperTitle>
              <StepperDescription
                :class="[state === 'active' && 'text-primary']"
                class="sr-only text-xs text-muted-foreground transition md:not-sr-only lg:text-sm"
              >
                {{ item.description }}
              </StepperDescription>
            </div>
          </StepperItem>
        </Stepper>
      </div>
      <!-- Step Content -->
      <div class="flex-1">
        <Card class="w-full shadow-lg border p-2">
          <CardHeader class="mb-4">
            <CardTitle>
              <span v-if="step === 0">Lead Information <span class="text-destructive">*</span></span>
              <span v-else-if="step === 1">Contact Details <span class="text-destructive">*</span></span>
              <span v-else-if="step === 2">Company Info</span>
              <span v-else>Meeting Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <template v-if="step === 0">
              <!-- Lead Information Form -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="space-y-2">
                  <Label for="lead-name">Lead Name <span class="text-destructive">*</span></Label>
                  <Input id="lead-name" placeholder="Enter lead name" required />
                </div>
                <div class="space-y-2">
                  <Label for="lead-source">Source</Label>
                  <Select>
                    <SelectTrigger id="lead-source" class="w-full">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="social">Social Media</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div class="space-y-2">
                  <Label for="lead-status">Status</Label>
                  <Select>
                    <SelectTrigger id="lead-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="proposal">Proposal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div class="space-y-2">
                  <Label for="lead-value">Estimated Value</Label>
                  <Input id="lead-value" placeholder="$0.00" type="text" />
                </div>
                <div class="space-y-2 md:col-span-2">
                  <Label for="lead-notes">Notes</Label>
                  <Textarea id="lead-notes" placeholder="Add notes about the lead" rows="3" />
                </div>
              </div>
            </template>
            <template v-else-if="step === 1">
              <!-- Contact Details Form -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-2">
                  <Label for="contact-name">Contact Name <span class="text-destructive">*</span></Label>
                  <Input id="contact-name" placeholder="Enter contact name" required />
                </div>
                <div class="space-y-2">
                  <Label for="contact-email">Email <span class="text-destructive">*</span></Label>
                  <Input id="contact-email" placeholder="email@example.com" type="email" required />
                </div>
                <div class="space-y-2">
                  <Label for="contact-phone">Phone</Label>
                  <Input id="contact-phone" placeholder="(00) 00000-0000" />
                </div>
                <div class="space-y-2">
                  <Label for="contact-position">Position</Label>
                  <Input id="contact-position" placeholder="Contact position" />
                </div>
                <div class="space-y-2 md:col-span-2">
                  <Label for="contact-notes">Notes</Label>
                  <Textarea id="contact-notes" placeholder="Add notes about the contact" rows="3" />
                </div>
              </div>
            </template>
            <template v-else-if="step === 2">
              <!-- Company Info Form -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-2">
                  <Label for="company-name">Company Name</Label>
                  <Input id="company-name" placeholder="Enter company name" />
                </div>
                <div class="space-y-2">
                  <Label for="company-segment">Segment</Label>
                  <Select>
                    <SelectTrigger id="company-segment">
                      <SelectValue placeholder="Select segment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div class="space-y-2">
                  <Label for="company-size">Company Size</Label>
                  <Select>
                    <SelectTrigger id="company-size">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-10">1-10 employees</SelectItem>
                      <SelectItem value="11-50">11-50 employees</SelectItem>
                      <SelectItem value="51-200">51-200 employees</SelectItem>
                      <SelectItem value="201-500">201-500 employees</SelectItem>
                      <SelectItem value="501+">501+ employees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div class="space-y-2">
                  <Label for="company-website">Website</Label>
                  <Input id="company-website" placeholder="www.example.com" />
                </div>
                <div class="space-y-2 md:col-span-2">
                  <Label for="company-address">Address</Label>
                  <Input id="company-address" placeholder="Company address" />
                </div>
              </div>
            </template>
            <template v-else>
              <!-- Meeting Details Form -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-2">
                  <Label for="meeting-date">Date</Label>
                  <Input id="meeting-date" type="date" />
                </div>
                <div class="space-y-2">
                  <Label for="meeting-time">Time</Label>
                  <Input id="meeting-time" type="time" />
                </div>
                <div class="space-y-2">
                  <Label for="meeting-type">Meeting Type</Label>
                  <Select>
                    <SelectTrigger id="meeting-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="presential">Presential</SelectItem>
                      <SelectItem value="virtual">Virtual</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div class="space-y-2">
                  <Label for="meeting-duration">Duration (minutes)</Label>
                  <Input id="meeting-duration" type="number" placeholder="30" />
                </div>
                <div class="space-y-2 md:col-span-2">
                  <Label for="meeting-agenda">Agenda</Label>
                  <Textarea id="meeting-agenda" placeholder="Describe the meeting agenda" rows="3" />
                </div>
              </div>
            </template>
          </CardContent>
          <div class="flex justify-between gap-2 px-5 py-2">
            <Button variant="outline" @click="prevStep" :disabled="step === 0">Back</Button>
            <Button @click="nextStep" v-if="step < totalSteps - 1">Next</Button>
            <Button v-else>Save Lead</Button>
          </div>
        </Card>
      </div>
    </div>
  </div>
</template> 