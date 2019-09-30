import json
import logging
import numpy as np
import os
import pandas as pd
import sys

from collections import Counter
from flask import Flask
from flask import Response
from flask import jsonify
from flask import render_template
from flask import request
from flask import send_from_directory
from libs import TfidfModel
from libs import nlp_length_functions
from libs.histogram_comparisons import HistogramComparison
from libs.review_db import ReviewDB

# logging configurations
logging.basicConfig(format='%(filename)s:%(lineno)d %(message)s')
log = logging.getLogger(__name__)
log.setLevel('INFO')

CONFIG = json.load(open("./../config.json"))
data_folder = os.path.join(os.environ['DATA_DIR'], CONFIG['dataset'])
schema = json.load(open(os.path.join(data_folder, 'schema.json')))['schema']

app = Flask(__name__, static_folder = './react-app/build/static', template_folder = './react-app/build')
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
app.config['TEMPLATES_AUTO_RELOAD'] = True

all_centroids_df = pd.read_csv(os.path.join(data_folder, 'centroids.csv'))
log.info('centroids loaded')
all_clusters_df = pd.read_csv(os.path.join(data_folder, 'clusters.csv'))
log.info('clusters loaded')
db_all = ReviewDB(all_clusters_df, all_centroids_df)
working_df = None

tfidf_model = TfidfModel.TFIDFModel(db_all)
tfidf_model_2g = TfidfModel.TFIDFModel(db_all, 2)

hotel_attr_path = lambda biz_id: os.path.join(data_folder, f'hotel-clusters/{biz_id}/attr.csv')
hotel_centroids_path = lambda biz_id: os.path.join(data_folder, f'hotel-clusters/{biz_id}/centroids.csv')

histogram_comparison_utils = HistogramComparison()

# [Xiong] setups for CORS access. I do this because I test the frontend on
# localhost:3000, while the server runs on localhost:5000. Eventually the CORS
# setup will make it possible for data server and front-end hosting server
# running on different machines --- which may not be necessary though
@app.after_request
def add_header(r):
    """
    adding disable cache header
    """
    r.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    r.headers["Pragma"] = "no-cache"
    r.headers["Expires"] = "0"
    r.headers['Cache-Control'] = 'public, max-age=0'
    return r

# @app.route('/')
# def index():
#     return render_template('index.html')
#     # return send_from_directory('./react-app/build/', 'index.html')

# [Xiong] endpoint for sending static files
@app.route('/data/<path:subpath>')
def data(subpath):    
    res = send_from_directory(f'{data_folder}', subpath)
    res.headers.add('Access-Control-Allow-Origin', '*')
    return res

# [Xiong] deprecated but I want to leave it here for now
# @app.route('/data-sample/')
# def data_sample():
#     sample_csv = ''
#     if request.args.get('x0') != None:
#         x0 = float(request.args.get('x0'))
#         x1 = float(request.args.get('x1'))
#         y0 = float(request.args.get('y0'))
#         y1 = float(request.args.get('y1'))
#         reduction = request.args.get('reduction')
#         filtered_df = df[(df[f'{reduction}_x'] > x0) & (df[f'{reduction}_x'] < x1) & (df[f'{reduction}_y'] > y0) & (df[f'{reduction}_y'] < y1)]
#         print(filtered_df.shape)
#         sample_csv = filtered_df.sample(500).to_csv()
#     else:
#         sample_csv = df.sample(500).to_csv()

#     res = Response(sample_csv, status = 200, mimetype = 'text/csv')
#     res.headers.add('Access-Control-Allow-Origin', '*')
#     return res

# [Xiong] endpoint for loading cluster centroids
# GET Args:
#   biz_id: id for locating an entity (e.g. hotel)
#   cid: id for locating a cluster
# Returns:
#   A csv string of requested centroids
@app.route('/centroids/')
def centroids():
    res = None
    biz_id = request.args.get('biz_id')
    log.info(f'requesting centroids for {biz_id}')
    centroids_df = None
    if biz_id == 'all':
        centroids_df = all_centroids_df
    else:
        # do something if this file doesn't exist, meaning so few reviews for this hotel
        # that we can't even do the first-layer clustering
        centroids_df = pd.read_csv(hotel_centroids_path(biz_id))

    if request.args.get('cid') != None:
        cid = request.args.get('cid')
        log.info(f'requesting cluster {cid}')
        clayer = len(cid.split('-'))
        layer_centroids_df = centroids_df[centroids_df['clayer'] == clayer]
        cur_centroids_df = layer_centroids_df[layer_centroids_df['cid'].str.startswith(cid + '-')]
        log.info(f'centroids_df.shape {cur_centroids_df.shape}')
        if cur_centroids_df.shape[0] == 0:
            reviews_df = select_reviews_by_layer(biz_id, cid)
            res = Response(json.dumps({ 'type': 'reviews', 'data': reviews_df.to_csv() }), status = 200, mimetype = 'application/json')
        else:
            res = Response(json.dumps({ 'type': 'centroids', 'data': cur_centroids_df.to_csv() }), status = 200, mimetype = 'application/json')
    else:
        log.info('requesting level 0 clusters')
        centroids_csv = centroids_df[centroids_df['clayer'] == 0].to_csv()
        res = Response(json.dumps({ 'type': 'centroids', 'data': centroids_csv }), status = 200, mimetype = 'application/json')

    res.headers.add('Access-Control-Allow-Origin', '*')
    return res

# [Xiong] endpoint for loading overall information for an entity (or all
# entities). It includes average char, word, sentence length, top words, top
# bigrams, cluster attribute histograms and averaged attributes
# GET Args:
#   biz_id: id for locating an entity (e.g. hotel)
# Returns:
#   A csv string of requested info
@app.route('/global-info/')
def global_info():
    biz_id = request.args.get('biz_id')
    db = select_db(biz_id)
    info = db.get_cluster_from_id('all')
    res = Response(info.to_csv(), status = 200, mimetype = 'application/csv')
    res.headers.add('Access-Control-Allow-Origin', '*')
    return res

# [Xiong] endpoint for loading information for a certain cluster. It includes
# average char, word, sentence length, and cluster attribute histograms. The
# averaged char, word and sentence length and averaged attributes are loaded
# from another endpoint. We probably need to refactor this two endpoints into
# one.
# GET Args:
#   biz_id: id for locating an entity (e.g. hotel)
#   cid: id for locating a cluster
# Returns:
#   A JSON string of the requested info
@app.route('/cluster-details/')
def cluster_details():
    biz_id = request.args.get('biz_id')
    cid = request.args.get('cid')
    db = select_db(biz_id)
    selected_cluster_df = db.get_cluster_from_id(cid)
    cluster_row = selected_cluster_df.iloc[0]

    detail = { 'hists': {} }
    for attr in schema:
        detail['hists'][attr] = list(map(lambda x: int(x), cluster_row[attr + '_hist'].split()))
    detail['div'] = (np.array(list(range(-10, 11, 1))) / 10).tolist()

    detail['avgCharLength'] = cluster_row['charLength']
    detail['avgWordLength'] = cluster_row['wordLength']
    detail['avgSentLength'] = cluster_row['sentLength']

    res = Response(json.dumps(detail), status = 200, mimetype = 'application/json')
    res.headers.add('Access-Control-Allow-Origin', '*')
    return res

# [Xiong] endpoint for /cluster-details/ functionalities but computed on the fly
@app.route('/cluster-details-live/')
def cluster_details_live():
    biz_id = request.args.get('biz_id')
    cid = request.args.get('cid')
    db = select_db(biz_id)
    selected_cluster_df = db.get_review_from_id(cid)
    # selected_cluster_df = db.get_cluster_from_id(cid)

    detail = { 'hists': {} }
    div = None
    for attr in schema:
        hist, div = np.histogram(selected_cluster_df[attr], bins = 20, range = (-1, 1))
        detail['hists'][attr] = hist.tolist()
    detail['div'] = div.tolist()

    nlp = nlp_length_functions.NLPLengths(db)
    detail['avgCharLength'] = nlp.char_review_length_counter(cid)[1]
    detail['avgWordLength'] = nlp.word_token_review_length_counter(cid)[1]
    detail['avgSentLength'] = nlp.sent_token_review_length_counter(cid)[1]

    res = Response(json.dumps(detail), status = 200, mimetype = 'application/json')
    res.headers.add('Access-Control-Allow-Origin', '*')
    return res

# [Xiong] endpoint for computing the distance between the histograms of two clusters.
# GET Args:
#   biz_id: id for locating an entity (e.g. hotel)
#   cid1: id for locating the first cluster to compare
#   cid2: id for locating the second cluster to compare
# Returns:
#   A JSON string of the distance array
@app.route('/histogram-comparison/')
def histogram_comparison():
    biz_id = request.args.get('biz_id')
    cid1 = request.args.get('cid1')
    cid2 = request.args.get('cid2')
    db = select_db(biz_id)
    cluster_row1 = db.get_cluster_from_id(cid1).iloc[0]
    cluster_row2 = db.get_cluster_from_id(cid2).iloc[0]
    hist_distances = {}
    for attr in schema:
        hist1 = dict(zip(list(range(20)), list(map(lambda x: int(x), cluster_row1[attr + '_hist'].split()))))
        hist2 = dict(zip(list(range(20)), list(map(lambda x: int(x), cluster_row2[attr + '_hist'].split()))))
        dist = histogram_comparison_utils.hellinger(Counter(hist1), Counter(hist2))
        hist_distances[attr] = dist

    res = Response(json.dumps(hist_distances), status = 200, mimetype = 'application/json')
    res.headers.add('Access-Control-Allow-Origin', '*')
    return res

# [Xiong] endpoint for computing the top n-grams of specified clusters. If two
# cluster ids are given, a comparison will be done.
# Args:
#   biz_id: id for locating an entity (e.g. hotel)
#   cid1: id for locating the first cluster to compute
#   cid2 - optional: id for locating the first cluster to compute
#   ngramsize: an interger N specifies what N-gram to compute. Currently only
#           unigram and bigrams are used in the prototype
#   fixed: True or False to compute the second topgram scores for the topgrams
#           from the first cluster
# Returns:
#   A JSON string of an array of topwords objects (word => score)
@app.route('/cluster-topngrams/')
def cluster_topwords():
    # detail['topwords'] = tfidf_model.top_k(cid, 5)
    biz_id = request.args.get('biz_id')
    cid1 = request.args.get('cid1')
    cid2 = request.args.get('cid2')
    ngramsize = int(request.args.get('ngramsize'))
    #fixed = bool(int(request.args.get('fixed')))
    fixed=False
    cur_tfidf_model = tfidf_model
    if ngramsize == 2:
        cur_tfidf_model = tfidf_model_2g
    if biz_id != 'all':
        db_biz = ReviewDB.load(cluster_file = hotel_attr_path(biz_id))
        cur_tfidf_model = TfidfModel.TFIDFModel(db_biz, ngramsize)

    topwords = None
    # [Xiong] Revise this part to make it more efficient!
    # Right now it's just a simple and dirty hack.
    if cid2 != None:
        if fixed:
            topwords = cur_tfidf_model.compare_fixed_set(cid1, cid2)
        else:
            topwords = [cur_tfidf_model.top_k(cid1), cur_tfidf_model.top_k(cid2)]
    else:
        topwords = [cur_tfidf_model.top_k(cid1)]

    res = Response(json.dumps(topwords), status = 200, mimetype = 'application/json')
    res.headers.add('Access-Control-Allow-Origin', '*')
    return res

# [Xiong] endpoint for loading review objects (text and other stats) from
# current working dataframe or freshly from a cluster (resetting working_df).
# If two cluster ids are given, the working_df will be set to concatenation
# of the reviews of two clusters.
# Args:
#   biz_id: id for locating an entity (e.g. hotel)
#   cid: id for locating the first cluster
#   cid2 - optional: id for locating the second cluster
#   starti: the starting index (for the "load more" feature)
# Returns:
#   A csv string of 10 reviews from working_df
@app.route('/cluster-reviews/')
def cluster_reviews():
    global working_df

    biz_id = request.args.get('biz_id')
    cid = request.args.get('cid')
    cid2 = request.args.get('cid2')
    starti = int(request.args.get('starti'))
    if starti == 0:
        working_df = None

    response_df = select_reviews_from_working_df(biz_id, cid, starti, cid2)

    res = Response(response_df.to_csv(), status = 200, mimetype = 'text/csv')
    res.headers.add('Access-Control-Allow-Origin', '*')
    return res

# [Xiong] endpoint for running command line code on the server. Essentially what
# we do is to manipulate the working_df.
# Args:
#   biz_id: id for locating an entity (e.g. hotel)
#   cid: id for locating the first cluster
#   cid2 - optional: id for locating the second cluster
#   code: the function name and arguments of the code we want to run on server.
#   starti: the starting index (this is usually set to 0 from the front-end)
# Returns:
#   A csv string of 10 reviews from working_df after applying the requested operation
@app.route('/remote-run/')
def remote_run():
    global working_df # adding this because we need to write to it

    biz_id = request.args.get('biz_id')
    cid = request.args.get('cid')
    cid2 = request.args.get('cid2')
    code = json.loads(request.args.get('code'))
    starti = int(request.args.get('starti'))
    func = code['func']
    args = code['args']

    response_df = None
    if func == 'tSort':
        attr = args[0]
        ascending = True if len(args) < 2 else args[1]
        working_df = working_df.sort_values(attr, ascending = ascending)
        response_df = select_reviews_from_working_df(biz_id, cid, starti, cid2)
    elif func == 'tFilter':
        attr = args[0]
        working_df = working_df[working_df[attr] != 0]
        response_df = select_reviews_from_working_df(biz_id, cid, starti, cid2)
    elif func == 'tGrep':
        pattern = args[0]
        working_df = working_df[working_df.text.str.contains(pattern)]
        response_df = select_reviews_from_working_df(biz_id, cid, starti, cid2)
    elif func == 'tReset':
        working_df = None
        response_df = select_reviews_from_working_df(biz_id, cid, starti, cid2)
    else:
        # TODO return an error message
        pass

    res = Response(response_df.to_csv(), status = 200, mimetype = 'application/json')
    res.headers.add('Access-Control-Allow-Origin', '*')
    return res

# [Xiong] minor hack to keep the front-end running on a different port
@app.route('/static/manifest.json')
def manifest():
    return send_from_directory('./react-app/build/', 'manifest.json')

def select_reviews_by_layer(biz_id, cid):
    '''
    Pick reviews for a certain layer under a certain entity (or all entities)
    Args:
        biz_id: id for locating an entity (e.g. hotel)
        cid: id for locating a cluster
    Returns:
        sub dataframes for the specified cluster
    '''
    if biz_id == 'all':
        return db_all.get_review_from_id(cid)
    else:
        db_biz = ReviewDB.load(hotel_attr_path(biz_id), hotel_centroids_path(biz_id))
        return db_biz.get_review_from_id(cid)

def select_reviews_from_working_df(biz_id, cid, starti, cid2 = '-1'):
    '''
    Pick 10 reviews from the current working dataframe starting from starti, and
    reset it based on biz_id and cid if working_df is None. The design of
    working_df is because of the command line feature on the front-end. When we
    run remote code, we work on the working_df so that we can keep the original
    data copy intact.
    Args:
        biz_id: id for locating an entity (e.g. hotel)
        cid: id for locating a cluster
        starti: starting index of the working_df (returns 10 reviews from that)
        cid2 - optional: id for locating a second cluster to concatenate with if
            specified.
    Returns:
        dataframe of 10 (or fewer) reviews from working_df
    '''
    global working_df # adding this because we need to write to it

    if working_df is None:
        working_df = select_reviews_by_layer(biz_id, cid)
        if cid2 != '-1':
            working_df = pd.concat([working_df, select_reviews_by_layer(biz_id, cid2)])

    reviews_slice_df = working_df.iloc[starti:starti + 10]

    return reviews_slice_df

def select_db(biz_id):
    '''
    Return a review_db obejct based on biz_id. The reason we have this function
    is to avoid loading a whole dataset on the fly, which can take a lot of time.
    Loading for only one entity is fairly fast.
    Args:
        biz_id: 'all' or actual entity id
    Returns:
        reference to the db object for all reviews or for one specific entity
    '''
    if biz_id == 'all':
        return db_all
    else:
        db_biz = ReviewDB.load(hotel_attr_path(biz_id), hotel_centroids_path(biz_id))
        return db_biz

def copy_db(biz_id, cid):
    '''
    Similar functionality to select_db, except we do the on-the-fly loading for
    the whole dataset.
    '''
    if biz_id == 'all':
        return ReviewDB.load(all_clusters_path, all_centroids_path)
    else:
        db_biz = ReviewDB.load(hotel_attr_path(biz_id), hotel_centroids_path(biz_id))
        return db_biz

if __name__=='__main__':
    app.run(host='0.0.0.0', port=5000)
