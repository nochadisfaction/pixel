tsc --noEmit --jsx react-jsx --esModuleInterop --allowSyntheticDefaultImports --skipLibCheck src/lib/utils/dynamic-components.tsx

src/components/chat/ChatContainer.tsx:1:30 - error TS2307: Cannot find module '@/types/chat' or its corresponding type declarations.

1 import type { Message } from '@/types/chat'
                               ~~~~~~~~~~~~~~

src/components/chat/ChatContainer.tsx:3:20 - error TS2307: Cannot find module '@/lib/utils' or its corresponding type declarations.

3 import { cn } from '@/lib/utils'
                     ~~~~~~~~~~~~~

src/components/chat/ChatContainer.tsx:106:28 - error TS2322: Type '{ role: string; content: string; name: string; }' is not assignable to type 'ExtendedMessage'.
  Object literal may only specify known properties, and 'role' does not exist in type 'ExtendedMessage'.

106                 message={{ role: 'assistant', content: '', name: 'Assistant' }}
                               ~~~~~~~~~~~~~~~~~

  src/components/chat/ChatMessage.tsx:13:3
    13   message: ExtendedMessage
         ~~~~~~~
    The expected type comes from property 'message' which is declared here on type 'IntrinsicAttributes & ChatMessageProps'

src/components/chat/ChatContainer.tsx:114:19 - error TS2322: Type '{ role: string; content: string; name: string; }' is not assignable to type 'ExtendedMessage'.
  Object literal may only specify known properties, and 'role' does not exist in type 'ExtendedMessage'.

114                   role: 'assistant',
                      ~~~~~~~~~~~~~~~~~

  src/components/chat/ChatMessage.tsx:13:3
    13   message: ExtendedMessage
         ~~~~~~~
    The expected type comes from property 'message' which is declared here on type 'IntrinsicAttributes & ChatMessageProps'

src/components/chat/ChatInput.tsx:1:20 - error TS2307: Cannot find module '@/lib/utils' or its corresponding type declarations.

1 import { cn } from '@/lib/utils'
                     ~~~~~~~~~~~~~

src/components/chat/ChatMessage.tsx:1:43 - error TS2307: Cannot find module '@/lib/chat/mentalHealthChat' or its corresponding type declarations.

1 import type { MentalHealthAnalysis } from '@/lib/chat/mentalHealthChat'
                                            ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

src/components/chat/ChatMessage.tsx:2:30 - error TS2307: Cannot find module '@/types/chat' or its corresponding type declarations.

2 import type { Message } from '@/types/chat'
                               ~~~~~~~~~~~~~~

src/components/chat/ChatMessage.tsx:3:20 - error TS2307: Cannot find module '@/lib/utils' or its corresponding type declarations.

3 import { cn } from '@/lib/utils'
                     ~~~~~~~~~~~~~

src/components/chat/ChatMessage.tsx:4:23 - error TS2307: Cannot find module '@/components/ui/badge' or its corresponding type declarations.

4 import { Badge } from '@/components/ui/badge'
                        ~~~~~~~~~~~~~~~~~~~~~~~

src/components/chat/ChatMessage.tsx:5:32 - error TS2307: Cannot find module '@/lib/markdown' or its corresponding type declarations.

5 import { markdownToHtml } from '@/lib/markdown'
                                 ~~~~~~~~~~~~~~~~

src/components/chat/ChatMessage.tsx:6:33 - error TS2307: Cannot find module '@/lib/dates' or its corresponding type declarations.

6 import { formatTimestamp } from '@/lib/dates'
                                  ~~~~~~~~~~~~~

src/components/chat/ChatMessage.tsx:27:26 - error TS2339: Property 'role' does not exist on type 'ExtendedMessage'.

27   const isUser = message.role === 'user'
                            ~~~~

src/components/chat/ChatMessage.tsx:28:32 - error TS2339: Property 'role' does not exist on type 'ExtendedMessage'.

28   const isBotMessage = message.role === 'assistant'
                                  ~~~~

src/components/chat/ChatMessage.tsx:29:35 - error TS2339: Property 'role' does not exist on type 'ExtendedMessage'.

29   const isSystemMessage = message.role === 'system'
                                     ~~~~

src/components/chat/ChatMessage.tsx:109:47 - error TS2339: Property 'content' does not exist on type 'ExtendedMessage'.

109             <div className="text-sm">{message.content}</div>
                                                  ~~~~~~~

src/components/chat/ChatMessage.tsx:115:48 - error TS2339: Property 'content' does not exist on type 'ExtendedMessage'.

115                 __html: markdownToHtml(message.content),
                                                   ~~~~~~~

src/components/chat/CognitiveModelSelector.tsx:2:25 - error TS2307: Cannot find module '@/lib/db/KVStore' or its corresponding type declarations.

2 import { KVStore } from '@/lib/db/KVStore'
                          ~~~~~~~~~~~~~~~~~~

src/components/chat/CognitiveModelSelector.tsx:3:38 - error TS2307: Cannot find module '@/lib/ai/services/PatientModelService' or its corresponding type declarations.

3 import type { ModelIdentifier } from '@/lib/ai/services/PatientModelService'
                                       ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

src/components/chat/CognitiveModelSelector.tsx:7:8 - error TS2307: Cannot find module '@/lib/ai/types/CognitiveModel' or its corresponding type declarations.

7 } from '@/lib/ai/types/CognitiveModel'
         ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

src/components/chat/CognitiveModelSelector.tsx:8:20 - error TS2307: Cannot find module '@/lib/utils' or its corresponding type declarations.

8 import { cn } from '@/lib/utils'
                     ~~~~~~~~~~~~~

src/components/chat/TherapyChatSystem.tsx:3:30 - error TS2307: Cannot find module '@/types/chat' or its corresponding type declarations.

3 import type { Message } from '@/types/chat'
                               ~~~~~~~~~~~~~~

src/components/chat/TherapyChatSystem.tsx:4:31 - error TS2307: Cannot find module '@/types/scenarios' or its corresponding type declarations.

4 import type { Scenario } from '@/types/scenarios'
                                ~~~~~~~~~~~~~~~~~~~

src/components/chat/TherapyChatSystem.tsx:5:33 - error TS2307: Cannot find module '@/data/scenarios' or its corresponding type declarations.

5 import { clientScenarios } from '@/data/scenarios'
                                  ~~~~~~~~~~~~~~~~~~

src/components/chat/TherapyChatSystem.tsx:6:26 - error TS2307: Cannot find module '@/lib/store' or its corresponding type declarations.

6 import { useStore } from '@/lib/store'
                           ~~~~~~~~~~~~~

src/components/chat/TherapyChatSystem.tsx:7:20 - error TS2307: Cannot find module '@/lib/utils' or its corresponding type declarations.

7 import { cn } from '@/lib/utils'
                     ~~~~~~~~~~~~~

src/components/chat/TherapyChatSystem.tsx:12:38 - error TS2307: Cannot find module '@/components/MentalHealthInsights' or its corresponding type declarations.

12 import { MentalHealthInsights } from '@/components/MentalHealthInsights'
                                        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

src/components/chat/TherapyChatSystem.tsx:21:24 - error TS2307: Cannot find module '@/components/ui/switch' or its corresponding type declarations.

21 import { Switch } from '@/components/ui/switch'
                          ~~~~~~~~~~~~~~~~~~~~~~~~

src/components/chat/TherapyChatSystem.tsx:22:23 - error TS2307: Cannot find module '@/components/ui/label' or its corresponding type declarations.

22 import { Label } from '@/components/ui/label'
                         ~~~~~~~~~~~~~~~~~~~~~~~

src/components/chat/TherapyChatSystem.tsx:23:30 - error TS2307: Cannot find module '@/hooks/useAIService' or its corresponding type declarations.

23 import { useAIService } from '@/hooks/useAIService'
                                ~~~~~~~~~~~~~~~~~~~~~~

src/components/chat/TherapyChatSystem.tsx:24:41 - error TS2307: Cannot find module '@/hooks/useMentalHealthAnalysis' or its corresponding type declarations.

24 import { useMentalHealthAnalysis } from '@/hooks/useMentalHealthAnalysis'
                                           ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

src/components/chat/TherapyChatSystem.tsx:28:8 - error TS2307: Cannot find module '@/hooks/useEmotionDetection' or its corresponding type declarations.

28 } from '@/hooks/useEmotionDetection'
          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

src/components/chat/TherapyChatSystem.tsx:29:35 - error TS2307: Cannot find module '@/hooks/useRiskAssessment' or its corresponding type declarations.

29 import { useRiskAssessment } from '@/hooks/useRiskAssessment'
                                     ~~~~~~~~~~~~~~~~~~~~~~~~~~~

src/components/chat/TherapyChatSystem.tsx:31:33 - error TS2307: Cannot find module '@/hooks/usePatientModel' or its corresponding type declarations.

31 import { usePatientModel } from '@/hooks/usePatientModel'
                                   ~~~~~~~~~~~~~~~~~~~~~~~~~

src/components/chat/TherapyChatSystem.tsx:32:34 - error TS2307: Cannot find module '@/lib/utils/load-sample-models' or its corresponding type declarations.

32 import { loadSampleModels } from '@/lib/utils/load-sample-models'
                                    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

src/components/chat/TherapyChatSystem.tsx:34:36 - error TS2307: Cannot find module '@/components/feedback/SupervisorFeedback' or its corresponding type declarations.

34 import { SupervisorFeedback } from '@/components/feedback/SupervisorFeedback'
                                      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

src/components/chat/TherapyChatSystem.tsx:182:9 - error TS2322: Type '{ role: string; content: string; name: string; }' is not assignable to type 'ExtendedMessage'.
  Object literal may only specify known properties, and 'role' does not exist in type 'ExtendedMessage'.

182         role: 'system',
            ~~~~~~~~~~~~~~

src/components/chat/TherapyChatSystem.tsx:199:7 - error TS2322: Type '{ role: string; content: string; name: string; }' is not assignable to type 'ExtendedMessage'.
  Object literal may only specify known properties, and 'role' does not exist in type 'ExtendedMessage'.

199       role: 'user',
          ~~~~~~~~~~~~

src/components/chat/TherapyChatSystem.tsx:273:23 - error TS2345: Argument of type '(prev: ExtendedMessage[]) => (ExtendedMessage | { role: string; content: string; name: string; })[]' is not assignable to parameter of type 'SetStateAction<ExtendedMessage[]>'.
  Type '(prev: ExtendedMessage[]) => (ExtendedMessage | { role: string; content: string; name: string; })[]' is not assignable to type '(prevState: ExtendedMessage[]) => ExtendedMessage[]'.
    Type '(ExtendedMessage | { role: string; content: string; name: string; })[]' is not assignable to type 'ExtendedMessage[]'.
      Type 'ExtendedMessage | { role: string; content: string; name: string; }' is not assignable to type 'ExtendedMessage'.
        Type '{ role: string; content: string; name: string; }' has no properties in common with type 'ExtendedMessage'.

273           setMessages((prev) => [
                          ~~~~~~~~~~~
274             ...prev,
    ~~~~~~~~~~~~~~~~~~~~
... 
279             },
    ~~~~~~~~~~~~~~
280           ])
    ~~~~~~~~~~~

src/components/chat/TherapyChatSystem.tsx:307:19 - error TS2345: Argument of type '(prev: ExtendedMessage[]) => (ExtendedMessage | { role: string; content: any; name: string; })[]' is not assignable to parameter of type 'SetStateAction<ExtendedMessage[]>'.
  Type '(prev: ExtendedMessage[]) => (ExtendedMessage | { role: string; content: any; name: string; })[]' is not assignable to type '(prevState: ExtendedMessage[]) => ExtendedMessage[]'.
    Type '(ExtendedMessage | { role: string; content: any; name: string; })[]' is not assignable to type 'ExtendedMessage[]'.
      Type 'ExtendedMessage | { role: string; content: any; name: string; }' is not assignable to type 'ExtendedMessage'.
        Type '{ role: string; content: any; name: string; }' has no properties in common with type 'ExtendedMessage'.

307       setMessages((prev) => [
                      ~~~~~~~~~~~
308         ...prev,
    ~~~~~~~~~~~~~~~~
... 
313         },
    ~~~~~~~~~~
314       ])
    ~~~~~~~

src/components/chat/TherapyChatSystem.tsx:364:19 - error TS2339: Property 'role' does not exist on type 'ExtendedMessage'.

364         role: msg.role === 'assistant' ? 'patient' : 'therapist',
                      ~~~~

src/components/chat/TherapyChatSystem.tsx:365:22 - error TS2339: Property 'content' does not exist on type 'ExtendedMessage'.

365         content: msg.content,
                         ~~~~~~~

src/components/chat/TherapyChatSystem.tsx:377:24 - error TS2339: Property 'role' does not exist on type 'ExtendedMessage'.

377           (msg) => msg.role === 'system' && msg.content.includes('focus:'),
                           ~~~~

src/components/chat/TherapyChatSystem.tsx:377:49 - error TS2339: Property 'content' does not exist on type 'ExtendedMessage'.

377           (msg) => msg.role === 'system' && msg.content.includes('focus:'),
                                                    ~~~~~~~

src/components/chat/TherapyChatSystem.tsx:379:27 - error TS2339: Property 'content' does not exist on type 'ExtendedMessage'.

379         .map((msg) => msg.content.replace('Current focus:', '').trim())
                              ~~~~~~~

src/components/chat/TherapyChatSystem.tsx:415:28 - error TS2339: Property 'role' does not exist on type 'ExtendedMessage'.

415       .filter((msg) => msg.role === 'user')
                               ~~~~

src/components/chat/TherapyChatSystem.tsx:416:25 - error TS2339: Property 'content' does not exist on type 'ExtendedMessage'.

416       .map((msg) => msg.content)
                            ~~~~~~~

src/components/chat/TherapyChatSystem.tsx:422:28 - error TS2339: Property 'role' does not exist on type 'ExtendedMessage'.

422       .filter((msg) => msg.role !== 'system')
                               ~~~~

src/components/chat/TherapyChatSystem.tsx:425:18 - error TS2339: Property 'role' does not exist on type 'ExtendedMessage'.

425           `${msg.role === 'user' ? 'Therapist' : 'Client'}: ${msg.content}`,
                     ~~~~

src/components/chat/TherapyChatSystem.tsx:425:67 - error TS2339: Property 'content' does not exist on type 'ExtendedMessage'.

425           `${msg.role === 'user' ? 'Therapist' : 'Client'}: ${msg.content}`,
                                                                      ~~~~~~~

src/components/chat/TherapyChatSystem.tsx:519:52 - error TS2339: Property 'name' does not exist on type 'EnhancedScenario'.

519               <span>Client Case: {selectedScenario.name}</span>
                                                       ~~~~

src/components/chat/TherapyChatSystem.tsx:565:40 - error TS2339: Property 'id' does not exist on type 'EnhancedScenario'.

565                       selectedScenario.id === scenario.id
                                           ~~

src/components/chat/TherapyChatSystem.tsx:701:62 - error TS2339: Property 'name' does not exist on type 'EnhancedScenario'.

701                 name: currentModel?.name || selectedScenario.name,
                                                                 ~~~~

src/components/chat/TherapyChatSystem.tsx:703:36 - error TS2339: Property 'description' does not exist on type 'EnhancedScenario'.

703                   selectedScenario.description,
                                       ~~~~~~~~~~~

src/components/chat/TherapyChatSystem.tsx:708:36 - error TS2339: Property 'name' does not exist on type 'EnhancedScenario'.

708                   selectedScenario.name,
                                       ~~~~

src/components/chat/TherapyChatSystem.tsx:722:15 - error TS2322: Type 'ExtendedMessage[]' is not assignable to type 'Message[]'.
  Type 'ExtendedMessage' is missing the following properties from type 'Message': role, content, name

722               messages={messages}
                  ~~~~~~~~

  src/components/chat/AnalyticsDashboardReact.tsx:69:3
    69   messages: Message[]
         ~~~~~~~~
    The expected type comes from property 'messages' which is declared here on type 'IntrinsicAttributes & AnalyticsDashboardProps'

src/components/chat/TherapyChatSystem.tsx:725:42 - error TS2339: Property 'name' does not exist on type 'EnhancedScenario'.

725               scenario={selectedScenario.name}
                                             ~~~~

src/hooks/useSecurity.ts:1:28 - error TS2307: Cannot find module '@/lib/fhe' or its corresponding type declarations.

1 import { fheService } from '@/lib/fhe'
                             ~~~~~~~~~~~


Found 57 errors in 6 files.

Errors  Files
     4  src/components/chat/ChatContainer.tsx:1
     1  src/components/chat/ChatInput.tsx:1
    11  src/components/chat/ChatMessage.tsx:1
     4  src/components/chat/CognitiveModelSelector.tsx:2
    36  src/components/chat/TherapyChatSystem.tsx:3
     1  src/hooks/useSecurity.ts:1