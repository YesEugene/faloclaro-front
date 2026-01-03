-- Add first 100 phrases to FaloClaro database
-- Run this in Supabase SQL Editor AFTER adding clusters

-- CLUSTER 1: Reactions and Responses (1-30)
INSERT INTO phrases (cluster_id, portuguese_text, order_index) 
SELECT id, 'Sim.', 1 FROM clusters WHERE name = 'Reactions and Responses' LIMIT 1
UNION ALL SELECT id, 'Não.', 2 FROM clusters WHERE name = 'Reactions and Responses' LIMIT 1
UNION ALL SELECT id, 'Talvez.', 3 FROM clusters WHERE name = 'Reactions and Responses' LIMIT 1
UNION ALL SELECT id, 'Claro.', 4 FROM clusters WHERE name = 'Reactions and Responses' LIMIT 1
UNION ALL SELECT id, 'Está bem.', 5 FROM clusters WHERE name = 'Reactions and Responses' LIMIT 1
UNION ALL SELECT id, 'Tudo bem.', 6 FROM clusters WHERE name = 'Reactions and Responses' LIMIT 1
UNION ALL SELECT id, 'Perfeito.', 7 FROM clusters WHERE name = 'Reactions and Responses' LIMIT 1
UNION ALL SELECT id, 'Exacto.', 8 FROM clusters WHERE name = 'Reactions and Responses' LIMIT 1
UNION ALL SELECT id, 'Pois.', 9 FROM clusters WHERE name = 'Reactions and Responses' LIMIT 1
UNION ALL SELECT id, 'Depende.', 10 FROM clusters WHERE name = 'Reactions and Responses' LIMIT 1
UNION ALL SELECT id, 'Não sei.', 11 FROM clusters WHERE name = 'Reactions and Responses' LIMIT 1
UNION ALL SELECT id, 'Acho que sim.', 12 FROM clusters WHERE name = 'Reactions and Responses' LIMIT 1
UNION ALL SELECT id, 'Acho que não.', 13 FROM clusters WHERE name = 'Reactions and Responses' LIMIT 1
UNION ALL SELECT id, 'Pode ser.', 14 FROM clusters WHERE name = 'Reactions and Responses' LIMIT 1
UNION ALL SELECT id, 'Já vejo.', 15 FROM clusters WHERE name = 'Reactions and Responses' LIMIT 1
UNION ALL SELECT id, 'Vamos ver.', 16 FROM clusters WHERE name = 'Reactions and Responses' LIMIT 1
UNION ALL SELECT id, 'Com certeza.', 17 FROM clusters WHERE name = 'Reactions and Responses' LIMIT 1
UNION ALL SELECT id, 'Nem por isso.', 18 FROM clusters WHERE name = 'Reactions and Responses' LIMIT 1
UNION ALL SELECT id, 'É verdade.', 19 FROM clusters WHERE name = 'Reactions and Responses' LIMIT 1
UNION ALL SELECT id, 'Tens razão.', 20 FROM clusters WHERE name = 'Reactions and Responses' LIMIT 1
UNION ALL SELECT id, 'Não acredito.', 21 FROM clusters WHERE name = 'Reactions and Responses' LIMIT 1
UNION ALL SELECT id, 'A sério?', 22 FROM clusters WHERE name = 'Reactions and Responses' LIMIT 1
UNION ALL SELECT id, 'Que pena.', 23 FROM clusters WHERE name = 'Reactions and Responses' LIMIT 1
UNION ALL SELECT id, 'Que bom.', 24 FROM clusters WHERE name = 'Reactions and Responses' LIMIT 1
UNION ALL SELECT id, 'Que estranho.', 25 FROM clusters WHERE name = 'Reactions and Responses' LIMIT 1
UNION ALL SELECT id, 'Faz sentido.', 26 FROM clusters WHERE name = 'Reactions and Responses' LIMIT 1
UNION ALL SELECT id, 'Não importa.', 27 FROM clusters WHERE name = 'Reactions and Responses' LIMIT 1
UNION ALL SELECT id, 'Não faz mal.', 28 FROM clusters WHERE name = 'Reactions and Responses' LIMIT 1
UNION ALL SELECT id, 'Tudo certo.', 29 FROM clusters WHERE name = 'Reactions and Responses' LIMIT 1
UNION ALL SELECT id, 'Está feito.', 30 FROM clusters WHERE name = 'Reactions and Responses' LIMIT 1;

-- CLUSTER 2: Politeness and Requests (31-55)
INSERT INTO phrases (cluster_id, portuguese_text, order_index) 
SELECT id, 'Por favor.', 1 FROM clusters WHERE name = 'Politeness and Requests' LIMIT 1
UNION ALL SELECT id, 'Obrigada.', 2 FROM clusters WHERE name = 'Politeness and Requests' LIMIT 1
UNION ALL SELECT id, 'Muito obrigada.', 3 FROM clusters WHERE name = 'Politeness and Requests' LIMIT 1
UNION ALL SELECT id, 'De nada.', 4 FROM clusters WHERE name = 'Politeness and Requests' LIMIT 1
UNION ALL SELECT id, 'Com licença.', 5 FROM clusters WHERE name = 'Politeness and Requests' LIMIT 1
UNION ALL SELECT id, 'Desculpa.', 6 FROM clusters WHERE name = 'Politeness and Requests' LIMIT 1
UNION ALL SELECT id, 'Peço desculpa.', 7 FROM clusters WHERE name = 'Politeness and Requests' LIMIT 1
UNION ALL SELECT id, 'Pode ajudar-me?', 8 FROM clusters WHERE name = 'Politeness and Requests' LIMIT 1
UNION ALL SELECT id, 'Pode repetir?', 9 FROM clusters WHERE name = 'Politeness and Requests' LIMIT 1
UNION ALL SELECT id, 'Mais devagar, por favor.', 10 FROM clusters WHERE name = 'Politeness and Requests' LIMIT 1
UNION ALL SELECT id, 'Pode esperar?', 11 FROM clusters WHERE name = 'Politeness and Requests' LIMIT 1
UNION ALL SELECT id, 'Um momento.', 12 FROM clusters WHERE name = 'Politeness and Requests' LIMIT 1
UNION ALL SELECT id, 'Já vou.', 13 FROM clusters WHERE name = 'Politeness and Requests' LIMIT 1
UNION ALL SELECT id, 'Já volto.', 14 FROM clusters WHERE name = 'Politeness and Requests' LIMIT 1
UNION ALL SELECT id, 'Não é preciso.', 15 FROM clusters WHERE name = 'Politeness and Requests' LIMIT 1
UNION ALL SELECT id, 'Está tudo bem.', 16 FROM clusters WHERE name = 'Politeness and Requests' LIMIT 1
UNION ALL SELECT id, 'Sem problema.', 17 FROM clusters WHERE name = 'Politeness and Requests' LIMIT 1
UNION ALL SELECT id, 'Se faz favor.', 18 FROM clusters WHERE name = 'Politeness and Requests' LIMIT 1
UNION ALL SELECT id, 'Pode ser agora?', 19 FROM clusters WHERE name = 'Politeness and Requests' LIMIT 1
UNION ALL SELECT id, 'Quando puder.', 20 FROM clusters WHERE name = 'Politeness and Requests' LIMIT 1
UNION ALL SELECT id, 'Obrigada pela ajuda.', 21 FROM clusters WHERE name = 'Politeness and Requests' LIMIT 1
UNION ALL SELECT id, 'Lamento.', 22 FROM clusters WHERE name = 'Politeness and Requests' LIMIT 1
UNION ALL SELECT id, 'Desculpe o atraso.', 23 FROM clusters WHERE name = 'Politeness and Requests' LIMIT 1
UNION ALL SELECT id, 'Foi sem querer.', 24 FROM clusters WHERE name = 'Politeness and Requests' LIMIT 1
UNION ALL SELECT id, 'Não foi nada.', 25 FROM clusters WHERE name = 'Politeness and Requests' LIMIT 1;

-- CLUSTER 3: Understanding / Not Understanding (56-75)
INSERT INTO phrases (cluster_id, portuguese_text, order_index) 
SELECT id, 'Não percebi.', 1 FROM clusters WHERE name = 'Understanding / Not Understanding' LIMIT 1
UNION ALL SELECT id, 'Percebo.', 2 FROM clusters WHERE name = 'Understanding / Not Understanding' LIMIT 1
UNION ALL SELECT id, 'Não entendo.', 3 FROM clusters WHERE name = 'Understanding / Not Understanding' LIMIT 1
UNION ALL SELECT id, 'Agora percebo.', 4 FROM clusters WHERE name = 'Understanding / Not Understanding' LIMIT 1
UNION ALL SELECT id, 'Mais ou menos.', 5 FROM clusters WHERE name = 'Understanding / Not Understanding' LIMIT 1
UNION ALL SELECT id, 'Um pouco.', 6 FROM clusters WHERE name = 'Understanding / Not Understanding' LIMIT 1
UNION ALL SELECT id, 'Não muito.', 7 FROM clusters WHERE name = 'Understanding / Not Understanding' LIMIT 1
UNION ALL SELECT id, 'Tudo claro.', 8 FROM clusters WHERE name = 'Understanding / Not Understanding' LIMIT 1
UNION ALL SELECT id, 'Não está claro.', 9 FROM clusters WHERE name = 'Understanding / Not Understanding' LIMIT 1
UNION ALL SELECT id, 'Pode explicar?', 10 FROM clusters WHERE name = 'Understanding / Not Understanding' LIMIT 1
UNION ALL SELECT id, 'O que quer dizer?', 11 FROM clusters WHERE name = 'Understanding / Not Understanding' LIMIT 1
UNION ALL SELECT id, 'Como assim?', 12 FROM clusters WHERE name = 'Understanding / Not Understanding' LIMIT 1
UNION ALL SELECT id, 'Já entendi.', 13 FROM clusters WHERE name = 'Understanding / Not Understanding' LIMIT 1
UNION ALL SELECT id, 'Não tenho a certeza.', 14 FROM clusters WHERE name = 'Understanding / Not Understanding' LIMIT 1
UNION ALL SELECT id, 'Parece-me bem.', 15 FROM clusters WHERE name = 'Understanding / Not Understanding' LIMIT 1
UNION ALL SELECT id, 'Não parece.', 16 FROM clusters WHERE name = 'Understanding / Not Understanding' LIMIT 1
UNION ALL SELECT id, 'É diferente.', 17 FROM clusters WHERE name = 'Understanding / Not Understanding' LIMIT 1
UNION ALL SELECT id, 'Faz diferença.', 18 FROM clusters WHERE name = 'Understanding / Not Understanding' LIMIT 1
UNION ALL SELECT id, 'É igual.', 19 FROM clusters WHERE name = 'Understanding / Not Understanding' LIMIT 1
UNION ALL SELECT id, 'É parecido.', 20 FROM clusters WHERE name = 'Understanding / Not Understanding' LIMIT 1;

-- CLUSTER 4: Movement, Time, Pauses (76-100)
INSERT INTO phrases (cluster_id, portuguese_text, order_index) 
SELECT id, 'Agora não.', 1 FROM clusters WHERE name = 'Movement, Time, Pauses' LIMIT 1
UNION ALL SELECT id, 'Agora sim.', 2 FROM clusters WHERE name = 'Movement, Time, Pauses' LIMIT 1
UNION ALL SELECT id, 'Mais tarde.', 3 FROM clusters WHERE name = 'Movement, Time, Pauses' LIMIT 1
UNION ALL SELECT id, 'Hoje não.', 4 FROM clusters WHERE name = 'Movement, Time, Pauses' LIMIT 1
UNION ALL SELECT id, 'Amanhã.', 5 FROM clusters WHERE name = 'Movement, Time, Pauses' LIMIT 1
UNION ALL SELECT id, 'Depois.', 6 FROM clusters WHERE name = 'Movement, Time, Pauses' LIMIT 1
UNION ALL SELECT id, 'Antes.', 7 FROM clusters WHERE name = 'Movement, Time, Pauses' LIMIT 1
UNION ALL SELECT id, 'Já passou.', 8 FROM clusters WHERE name = 'Movement, Time, Pauses' LIMIT 1
UNION ALL SELECT id, 'Ainda não.', 9 FROM clusters WHERE name = 'Movement, Time, Pauses' LIMIT 1
UNION ALL SELECT id, 'Já está.', 10 FROM clusters WHERE name = 'Movement, Time, Pauses' LIMIT 1
UNION ALL SELECT id, 'Ainda há tempo.', 11 FROM clusters WHERE name = 'Movement, Time, Pauses' LIMIT 1
UNION ALL SELECT id, 'Estou a chegar.', 12 FROM clusters WHERE name = 'Movement, Time, Pauses' LIMIT 1
UNION ALL SELECT id, 'Estou a ir.', 13 FROM clusters WHERE name = 'Movement, Time, Pauses' LIMIT 1
UNION ALL SELECT id, 'Estou aqui.', 14 FROM clusters WHERE name = 'Movement, Time, Pauses' LIMIT 1
UNION ALL SELECT id, 'Já cheguei.', 15 FROM clusters WHERE name = 'Movement, Time, Pauses' LIMIT 1
UNION ALL SELECT id, 'Fico aqui.', 16 FROM clusters WHERE name = 'Movement, Time, Pauses' LIMIT 1
UNION ALL SELECT id, 'Vamos embora.', 17 FROM clusters WHERE name = 'Movement, Time, Pauses' LIMIT 1
UNION ALL SELECT id, 'Volto já.', 18 FROM clusters WHERE name = 'Movement, Time, Pauses' LIMIT 1
UNION ALL SELECT id, 'Sem pressa.', 19 FROM clusters WHERE name = 'Movement, Time, Pauses' LIMIT 1
UNION ALL SELECT id, 'Com calma.', 20 FROM clusters WHERE name = 'Movement, Time, Pauses' LIMIT 1
UNION ALL SELECT id, 'Muito cedo.', 21 FROM clusters WHERE name = 'Movement, Time, Pauses' LIMIT 1
UNION ALL SELECT id, 'Muito tarde.', 22 FROM clusters WHERE name = 'Movement, Time, Pauses' LIMIT 1
UNION ALL SELECT id, 'A tempo.', 23 FROM clusters WHERE name = 'Movement, Time, Pauses' LIMIT 1
UNION ALL SELECT id, 'Fora de horas.', 24 FROM clusters WHERE name = 'Movement, Time, Pauses' LIMIT 1
UNION ALL SELECT id, 'Está perto.', 25 FROM clusters WHERE name = 'Movement, Time, Pauses' LIMIT 1;

